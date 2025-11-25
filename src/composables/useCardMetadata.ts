import { computed, ref, toRaw, watch } from 'vue'
import type { EnrichedCardData } from '@/utils/types'
import { getCardData, getCardDataBySlugAndNumber } from '@/api/cardClient';
import { fetchCardDataNormalizedCoverageWithSlug, fetchMagicSetData } from '@/api/dashboard';


function _normalizeCardSearch(input = ''): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')  // Replace all non-alphanumeric with space
    .trim()                        // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ');         // Collapse multiple spaces
}

export function useCardMetadata() {
    const selectedCardId = ref(null);
    const selectedMetadata = ref<any>(null);
    const reprints = ref<EnrichedCardData[]>([]);
    const allReleasedSets = ref<any[]>([]); // Assume this gets populated elsewhere

    const enrichedPrintings = ref<EnrichedCardData[]>([]);
    const currentPrintingIndex = ref(0);
    const showBackFace = ref(false);
    const isNavigatingCarousel = ref(false);
    const loading = ref(false);
    const error = ref('');
    let lastRequest = 0;

    const magicSetData = computed(() => {
        return allReleasedSets.value.reduce((acc, set) => {
        acc[set.set_name] = {
            set_code: set.official_set_code,
            release_date: set.release_date,
            total_cards: set.total_cards
        };
        return acc;
        }, {});
    });    

    async function ensureReleasedSetsLoaded() {
        if (allReleasedSets.value.length > 0) return;
        try {
            const sets = await fetchMagicSetData();
            allReleasedSets.value = sets;
        } catch (err) {
            console.error('Failed to load released sets data:', err);
        }
    }

    const searchCards = async (searchText: string) => {
        if (!searchText.trim()) return;

        loading.value = true;
        error.value = '';
        reprints.value = [];
        selectedMetadata.value = null;

        try {
            let searchQuery = searchText.trim();
            const { data } = await getCardData(_normalizeCardSearch(searchQuery));
            
            // Deduplicate DFC cards (they might come back with both faces)
            const uniqueCards = new Map();
            data.forEach((card: { set_name: any; number_in_set: any; }) => {
            const key = `${card.set_name}_${card.number_in_set}`;
            // Only keep first occurrence (front face) for each set+number combo
            if (!uniqueCards.has(key)) {
                uniqueCards.set(key, card);
            }
            });
            
            reprints.value = Array.from(uniqueCards.values());
        } catch (err) {
            error.value = 'No matching cards found.';
        } finally {
            loading.value = false;
        }
    };    

    // Watch for selectedMetadata changes and enrich printings
    watch(selectedMetadata, async (newVal, oldVal) => {
        // Skip if we're just navigating the carousel
        if (isNavigatingCarousel.value) {
            isNavigatingCarousel.value = false;
            return;
        }
        
        // Reset back face when changing cards
        showBackFace.value = false;
        
        if (!newVal?.related_printings || !newVal.card?.name) {
            enrichedPrintings.value = [];
            return;
        }

        // Avoid re-fetching if it's the same card (prevents infinite loops)
        if (oldVal?.card?.id === newVal?.card?.id && enrichedPrintings.value.length > 0) {
            return;
        }

        // Parse the comma-separated string of set codes
        const setCodes = newVal.related_printings.split(',').map((s: string) => s.trim());
        
        // Filter the existing reprints data (from Stage 1 search)
        // Match by exact card name AND set code in related_printings
        const targetCardName = newVal.card.name;
        
        const uniqueCards = new Map();
        
        reprints.value.forEach(card => {
            const key = `${card.set_name}_${card.number_in_set}`;
            // Only include if: 1) exact name match, 2) set is in related_printings
            if (!uniqueCards.has(key) && 
                card.name === targetCardName && 
                setCodes.includes(card.set_name)) {
            
            // Enrich with set data from allReleasedSets
            const setInfo = allReleasedSets.value.find(s => 
                s.code === card.set_name || s.set_name === card.set_name
            );
            
            uniqueCards.set(key, {
                ...card,
                release_date: setInfo?.release_date || card.release_date || '9999-12-31',
                set_full_name: setInfo?.name || card.set_name,
            });
            }
        });
    
        enrichedPrintings.value = Array.from(uniqueCards.values())
            .sort((a, b) => a.release_date.localeCompare(b.release_date));
        
        // Find the index by matching set_name and number_in_set
        if (selectedCardId.value) {
            const selectedCard = newVal.card;
            const index = enrichedPrintings.value.findIndex(card => 
            card.set_name === selectedCard.set_name && 
            card.number_in_set === selectedCard.number_in_set
            );
            currentPrintingIndex.value = index !== -1 ? index : 0;
        } else {
            currentPrintingIndex.value = 0;
        }
    });

    async function populateReprintsIfNeeded(cardName: string | undefined) {
        if (!cardName) return;
        // quick scan: does existing reprints already include this card name?
        const matchesExisting = reprints.value.some(r => {
            // some sources may have slight name differences; normalize both sides
            try {
            return _normalizeCardSearch(String(r.name || '')).trim() === _normalizeCardSearch(cardName).trim();
            } catch { return false; }
        });

        if (matchesExisting) return;

        // fetch fresh list for this card name
        const normalized = _normalizeCardSearch(cardName);
        try {
            const { data } = await getCardData(normalized);

            // Deduplicate by set+number
            const unique = new Map<string, any>();
            data.forEach((card: any) => {
            const key = `${card.set_name}_${card.number_in_set}`;
            if (!unique.has(key)) unique.set(key, card);
            });

            // Replace entire reprints reference so watchers react reliably
            reprints.value = Array.from(unique.values());
        } catch (e) {
            // non-fatal — leave reprints empty so watcher handles fallback gracefully
            reprints.value = [];
            console.debug('populateReprintsIfNeeded: fetch failed for', cardName, e);
        }
    }

    async function loadCardMetadata({ cardId, cardSet, cardSlug, cardNumberInSet } = {}) {
        const req = ++lastRequest;
        loading.value = true;
        error.value = '';
        selectedCardId.value = cardId; // Store which card was clicked
        showBackFace.value = false; // Reset to front face

        try {
            await ensureReleasedSetsLoaded();

            const data = await fetchCardDataNormalizedCoverageWithSlug(cardSet, cardSlug, cardNumberInSet);

            if (req !== lastRequest) {
                // A newer request has been made; discard this result
                return;
            }

            // Populate reprints if empty
            await populateReprintsIfNeeded(data.card?.name);
            selectedMetadata.value = data;            
        } catch (err) {
            error.value = 'Failed to load metadata.';
        } finally {
            loading.value = false;
        }
    }

    const currentPrinting = computed(() => {
        if (!enrichedPrintings.value.length) {
            return selectedMetadata.value?.card;
        }
        // Safety check: ensure index is valid
        if (currentPrintingIndex.value >= enrichedPrintings.value.length) {
            currentPrintingIndex.value = 0;
        }
        return enrichedPrintings.value[currentPrintingIndex.value] || selectedMetadata.value?.card;
    });

    // Check if current card is a DFC
    const isDFC = computed(() => {
        return !!currentPrinting.value?.back_image_url || 
                !!selectedMetadata.value?.card?.back_image_url;
    });

    // Get the appropriate image URL based on face shown
    const currentImageUrl = computed(() => {
        if (showBackFace.value && isDFC.value) {
            return currentPrinting.value?.back_image_url || 
                selectedMetadata.value?.card?.back_image_url;
        }
        return currentPrinting.value?.image_url;
    });

    // Transform pricing data for v-data-table
    const priceItems = computed(() => {
        const byId = selectedMetadata.value?.bulk_price_data;

        if (byId && typeof byId === 'object') {
            return Object.values(byId).map(obj => {
            // obj is expected to be plain (from backend)
            const id = obj?.id ?? null;
            const label = obj?.label ?? `${obj?.set_name ?? ''} #${obj?.number_in_set ?? ''}`;
            const price = Number(obj?.price ?? 0) || 0;
            const urls = obj?.purchaseUrls ?? {};

            // tolerate different casings from backend
            const tcgplayerUrl = urls.tcgplayer ?? urls.tcgPlayer ?? urls['tcg_player'] ?? null;
            const cardKingdomUrl = urls.cardkingdom ?? urls.cardKingdom ?? urls['card_kingdom'] ?? null;

            return {
                id,
                finish: label,
                price,
                priceFormatted: `$${price.toFixed(2)}`,
                tcgplayerUrl,
                cardKingdomUrl,
                raw: obj
            };
            });
        }

        return [];
        });

    const priceMapById = computed(() => {
        return priceItems.value.reduce((acc, it) => {
            if (it.id != null) acc[String(it.id)] = it;
            return acc;
        }, {});
    });

    // Transform deck usage data for v-data-table
    const deckItems = computed(() => {
        if (!selectedMetadata.value?.deck_usages) return [];
        
        const items: any[] = [];
        Object.entries(selectedMetadata.value.deck_usages).forEach(([archetype, decks]) => {
            decks.forEach((deck: any) => {
            items.push({
                ...deck,
                archetype,
            });
            });
        });
        return items;
    });

    const priceMapByCompositeKey__ = ref({});

    const clearSelection = () => {
        selectedMetadata.value = null;
        currentPrintingIndex.value = 0;
        enrichedPrintings.value = [];
        selectedCardId.value = null;
        showBackFace.value = false;
    };

    const previousPrinting = () => {
        if (!enrichedPrintings.value.length) return;
        showBackFace.value = false; // Reset to front face when changing printings
        currentPrintingIndex.value = 
            (currentPrintingIndex.value - 1 + enrichedPrintings.value.length) % 
            enrichedPrintings.value.length;
    };

    const nextPrinting = () => {
    if (!enrichedPrintings.value.length) return;
        showBackFace.value = false; // Reset to front face when changing printings
        currentPrintingIndex.value = 
            (currentPrintingIndex.value + 1) % enrichedPrintings.value.length;
    };

    const toggleCardFace = () => {
        showBackFace.value = !showBackFace.value;
    };

    const priceMap = computed(() => ({ ...priceItems.value }));

    function selectPrintingFromList(print: { id: null; set_name: any; number_in_set: any; }) {
        showBackFace.value = false;
        selectedCardId.value = print.id;
        const index = enrichedPrintings.value.findIndex(p => p.id === print.id);
        //console.log("Looking for current printing index for:", selectedCardId.value);
        currentPrintingIndex.value = index !== -1 ? index : 0;
        isNavigatingCarousel.value = true;        
    };

    async function selectPrinting(cardId: any, cardSet: any, cardSlug: any, cardNumberInSet: any) {
        return loadCardMetadata({ cardId, cardSet, cardSlug, cardNumberInSet });
    }

    return {
        loading,
        error,
        magicSetData,
        selectedCardId,
        isDFC,
        currentImageUrl,
        currentPrinting,
        currentPrintingIndex,
        selectedMetadata,
        enrichedPrintings,
        showBackFace,
        isNavigatingCarousel,
        loadCardMetadata,
        clearSelection,
        previousPrinting,
        nextPrinting,
        toggleCardFace,
        priceItems,
        priceMapById,
        deckItems,
        priceMap,
        reprints,
        selectPrintingFromList,
        selectPrinting,
        searchCards
    };
}
