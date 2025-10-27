<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { getCardData, getCardDataBySlugAndNumber } from '@/api/cardClient';
import { fetchCardDataNormalizedCoverageWithSlug, fetchMagicSetData } from '@/api/dashboard';
import { getColorManaCost, getNumericalManaCost, mapColorCodeToName} from '../utils/deckUtils'
import Colors from './Colors.vue';

const searchText = ref('');
const reprints = ref([]);
const loading = ref(false);
const error = ref('');
const selectedMetadata = ref(null);
const currentPrintingIndex = ref(0);
const allReleasedSets = ref([]);
const enrichedPrintings = ref([]);
const priceMapByCompositeKey = ref({});
const selectedCardId = ref(null); // Track which card was clicked
const showBackFace = ref(false); // Toggle for DFC back face
const isNavigatingCarousel = ref(false); // Flag to prevent watcher from running during carousel navigation

// ... (keep all the existing header/table configs)

const priceHeaders = [
  { title: 'Finish', key: 'finish', sortable: true },
  { title: 'Price', key: 'price', sortable: true, align: 'end' },
];

const deckHeaders = [
  { title: 'Count', key: 'card_count', sortable: true, align: 'start' },
  { title: 'Deck Name', key: 'deck_name', sortable: true },
  { title: 'Format', key: 'format', sortable: true, align: 'end' },
  { title: 'Archetype', key: 'archetype', sortable: true },
  { title: 'Link', key: 'external_link', sortable: false },
];

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
  const setCodes = newVal.related_printings.split(',').map(s => s.trim());
  
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

// Get current printing to display - add safety check
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
  if (!selectedMetadata.value?.bulk_price_data) return [];
  
  return Object.entries(selectedMetadata.value.bulk_price_data).map(([label, price]) => ({
    finish: label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    price: parseFloat(price) || 0,
    priceFormatted: `$${parseFloat(price).toFixed(2)}`,
  }));
});

// Transform deck usage data for v-data-table
const deckItems = computed(() => {
  if (!selectedMetadata.value?.deck_usages) return [];
  
  const items = [];
  Object.entries(selectedMetadata.value.deck_usages).forEach(([archetype, decks]) => {
    decks.forEach(deck => {
      items.push({
        ...deck,
        archetype,
      });
    });
  });
  return items;
});

// Card stats for quick view
const cardStats = computed(() => {
  if (!selectedMetadata.value) return [];
  
  const meta = selectedMetadata.value;
  const printingCount = enrichedPrintings.value.length || 
    (meta.related_printings ? meta.related_printings.split(',').length : 0);
  
  return [
    { icon: 'mdi-package-variant', label: 'Total Owned', value: meta.total_owned || 0, color: 'primary' },
    { icon: 'mdi-currency-usd', label: 'Lowest Price', value: lowestPrice.value, color: 'magenta' },
    { icon: 'mdi-currency-usd', label: 'Avg Price', value: averagePrice.value, color: 'warning' },
    { icon: 'mdi-cards-playing', label: 'Deck Uses', value: deckItems.value.length, color: 'success' },
    { icon: 'mdi-cards', label: 'Printings', value: printingCount, color: 'secondary' },
  ];
});

const lowestPrice = computed(() => {
  if (!priceItems.value.length) return '$0.00';
  const lowest = Math.min(...priceItems.value.map(item => item.price));
  return `$${lowest.toFixed(2)}`;
});

const averagePrice = computed(() => {
  if (!priceItems.value.length) return '$0.00';
  const avg = priceItems.value.reduce((sum, item) => sum + item.price, 0) / priceItems.value.length;
  return `$${avg.toFixed(2)}`;
});

function normalizeCardSearch(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')  // Replace all non-alphanumeric with space
    .trim()                        // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ');         // Collapse multiple spaces
}

const searchCards = async () => {
  if (!searchText.value.trim()) return;

  loading.value = true;
  error.value = '';
  reprints.value = [];
  selectedMetadata.value = null;

  try {
    let searchQuery = searchText.value.trim();
    const { data } = await getCardData(normalizeCardSearch(searchQuery));
    
    // Deduplicate DFC cards (they might come back with both faces)
    const uniqueCards = new Map();
    data.forEach(card => {
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

const selectPrinting = async (cardId, set, cardSlug, number) => {
  loading.value = true;
  error.value = '';
  selectedCardId.value = cardId; // Store which card was clicked
  showBackFace.value = false; // Reset to front face

  try {
    const data = await fetchCardDataNormalizedCoverageWithSlug(set, cardSlug, number);
    selectedMetadata.value = data;

    priceMapByCompositeKey.value = Object.entries(selectedMetadata.value.bulk_price_data).reduce((acc, [key, price]) => {
      acc[key] = parseFloat(price);
      return acc;
    }, {});
  } catch (err) {
    error.value = 'Failed to load metadata.';
  } finally {
    loading.value = false;
  }
};

const clearSelection = () => {
  selectedMetadata.value = null;
  currentPrintingIndex.value = 0;
  enrichedPrintings.value = [];
  selectedCardId.value = null;
  priceMapByCompositeKey.value = null;
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

// Updated function for clicking cards in Related Printings list
const selectPrintingFromList = async (print) => {
  showBackFace.value = false;
  selectedCardId.value = print.id;
  const index = enrichedPrintings.value.findIndex(p => p.id === print.id);
  currentPrintingIndex.value = index !== -1 ? index : 0;
  
  // Set flag to prevent watcher from re-fetching
  isNavigatingCarousel.value = true;
  
  // Update metadata without triggering a full refetch
  // The card data is already in enrichedPrintings, just update the selected card
  console.log('Selected printing from list:', print.set_name, print.number_in_set);
};

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

const setCodeMap = computed(() => {
  return allReleasedSets.value.reduce((acc, set) => {
    acc[set.set_code] = set;
  return acc;
  }, {});
});

onMounted(async () => {
  try {
    const sets = await fetchMagicSetData();
    allReleasedSets.value = sets;
  } catch (err) {
    console.error('Failed to fetch released sets:', err);
  }
});
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <v-icon size="40" color="primary" class="mr-3">mdi-magnify</v-icon>
          <div>
            <h1 class="text-h4 font-weight-bold">Card Metadata Dashboard</h1>
            <p class="text-subtitle-1 text-medium-emphasis">Search and analyze card data, pricing, and usage</p>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Search Section -->
    <v-row v-if="!selectedMetadata">
      <v-col cols="12" md="8" lg="6">
        <v-card elevation="2">
          <v-card-text>
            <v-text-field
              v-model="searchText"
              label="Search for a card"
              placeholder="e.g. Lightning Bolt"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              clearable
              :loading="loading"
              @keyup.enter="searchCards"
              density="comfortable"
            />
            <v-btn
              color="primary"
              size="large"
              block
              :disabled="loading || !searchText.trim()"
              :loading="loading"
              @click="searchCards"
            >
              Search Cards
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Error Alert -->
    <v-row v-if="error">
      <v-col cols="12">
        <v-alert type="error" variant="tonal" closable @click:close="error = ''">
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>

    <!-- Reprint Grid -->
    <v-row v-if="!selectedMetadata && reprints.length">
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="secondary">mdi-printer</v-icon>
            Available Printings ({{ reprints.length }})
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-row>
              <v-col
                v-for="card in reprints"
                :key="card.id"
                cols="6"
                sm="4"
                md="3"
                lg="2"
              >
                <v-card
                  hover
                  class="reprint-card"
                  @click="selectPrinting(card.id, card.set_name, card.slug, card.number_in_set)"
                >
                  <v-img
                    :src="card.image_url"
                    :alt="card.name"
                    aspect-ratio="0.715"
                    cover
                  >
                    <template v-slot:placeholder>
                      <v-row class="fill-height ma-0" align="center" justify="center">
                        <v-progress-circular indeterminate color="grey-lighten-5" />
                      </v-row>
                    </template>
                  </v-img>
                  <v-card-text class="text-center pa-2">
                    <div class="text-caption text-medium-emphasis">
                      {{ card.set_name }}
                    </div>
                    <div class="text-caption font-weight-medium">
                      #{{ card.number_in_set ?? card.id }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Metadata Display -->
    <div v-if="selectedMetadata">
      <!-- Back Button -->
      <v-row>
        <v-col cols="12">
          <v-btn
            variant="text"
            prepend-icon="mdi-arrow-left"
            @click="clearSelection"
          >
            Back to Search
          </v-btn>
        </v-col>
      </v-row>

      <!-- Card Header -->
      <v-row>
        <v-col cols="12">
          <v-card elevation="3" color="surface-variant">
            <v-card-title class="text-h5 font-weight-bold">
              {{ selectedMetadata.card.name }}
            </v-card-title>
            <v-card-subtitle>
              {{ magicSetData[selectedMetadata.card?.set_name]?.set_code ?? 'Promo Set'}} •
              {{ selectedMetadata.card.set_name }} • 
              #{{ selectedMetadata.card.number_in_set }} • 
              {{ selectedMetadata.card.rarity }}
            </v-card-subtitle>
          </v-card>
        </v-col>
      </v-row>

      <!-- Stats Cards -->
      <v-row class="mt-2">
        <v-col
          v-for="stat in cardStats"
          :key="stat.label"
          cols="5"
          sm="2"
        >
          <v-card :color="stat.color" variant="tonal">
            <v-card-text>
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h5 font-weight-bold">{{ stat.value }}</div>
                  <div class="text-caption">{{ stat.label }}</div>
                </div>
                <v-icon size="40" :color="stat.color">{{ stat.icon }}</v-icon>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Card Overview -->
      <v-row class="mt-4">
        <v-col cols="12" md="4">
          <v-card elevation="2">
            <v-card-title>
              <v-icon class="mr-2" color="primary">mdi-image</v-icon>
              Card Image
              <v-chip 
                v-if="enrichedPrintings.length > 1" 
                size="small" 
                class="ml-2"
                variant="tonal"
              >
                {{ currentPrintingIndex + 1 }} / {{ enrichedPrintings.length }}
              </v-chip>
            </v-card-title>
            <v-divider />
             <v-card-text class="pa-0 position-relative">
              <div class="card-image-container">
                <v-img
                  :src="currentImageUrl"
                  :alt="currentPrinting?.name"
                  aspect-ratio="0.715"
                  max-width="265"
                  class="mx-auto"
                >
                  <template v-slot:placeholder>
                    <v-row class="fill-height ma-0" align="center" justify="center">
                      <v-progress-circular indeterminate color="primary" />
                    </v-row>
                  </template>
                </v-img>
                
                <!-- DFC Flip Button -->
                <v-btn
                  v-if="isDFC"
                  icon="mdi-rotate-3d-variant"
                  size="small"
                  class="flip-button"
                  variant="flat"
                  color="primary"
                  @click="toggleCardFace"
                >
                  <v-icon>{{ showBackFace ? 'mdi-card-text' : 'mdi-card-text-outline' }}</v-icon>
                  <v-tooltip activator="parent" location="top">
                    {{ showBackFace ? 'Show Front Face' : 'Show Back Face' }}
                  </v-tooltip>
                </v-btn>
                
                <!-- Navigation Arrows -->
                <template v-if="enrichedPrintings.length > 1">
                  <v-btn
                    icon="mdi-chevron-left"
                    size="large"
                    class="carousel-arrow carousel-arrow-left"
                    variant="flat"
                    @click="previousPrinting"
                  />
                  <v-btn
                    icon="mdi-chevron-right"
                    size="large"
                    class="carousel-arrow carousel-arrow-right"
                    variant="flat"
                    @click="nextPrinting"
                  />
                </template>
              </div>
              
              <!-- Printing Info -->
              <div class="pa-3 text-center">
                <div class="text-subtitle-2 font-weight-bold">
                  {{ magicSetData[currentPrinting.set_name]?.set_code ?? 'Promo Set' }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ currentPrinting?.set_full_name || currentPrinting?.set_name }} #{{ currentPrinting?.number_in_set ?? currentPrinting?.id }}
                </div>
                <div class="text-caption" v-if="isDFC">
                  <v-chip size="x-small" color="info" variant="tonal">
                    {{ showBackFace ? 'Back Face' : 'Front Face' }}
                  </v-chip>
                </div>
                <div>
                  Price : {{ priceMapByCompositeKey[`${currentPrinting.set_name} #${currentPrinting.number_in_set}`] != null 
                    ? `$${priceMapByCompositeKey[`${currentPrinting.set_name} #${currentPrinting.number_in_set}`].toFixed(2)}` 
                    : 'N/A' }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="8">
          <v-card elevation="2" class="h-100">
            <v-card-title>
              <v-icon class="mr-2" color="primary">mdi-information</v-icon>
              Card Details
            </v-card-title>
            <v-divider />
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-shape</v-icon>
                  </template>
                  <v-list-item-title>Type</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedMetadata.card.type }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-water</v-icon>
                  </template>
                  <v-list-item-title>Mana Cost</v-list-item-title>
                    <div class="mana-cost-display d-flex align-center">
                      <!-- Numerical/Generic mana cost -->
                      <Colors 
                        v-if="selectedMetadata.card.mana_cost" 
                        :mana_cost="getNumericalManaCost(selectedMetadata.card.mana_cost)" 
                        :size="20"
                      />
                      
                      <!-- Color symbols -->
                      <span
                        v-for="(colorCode, idx) in getColorManaCost(selectedMetadata.card.mana_cost)"
                        :key="idx"
                      >
                        <Colors 
                          :color_name="mapColorCodeToName(colorCode)" 
                          :size="20"
                        />
                      </span>
                      
                      <!-- Fallback if no mana cost -->
                      <span v-if="!selectedMetadata.card.mana_cost" class="text-medium-emphasis">
                        N/A
                      </span>
                    </div>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-palette</v-icon>
                  </template>
                  <v-list-item-title>Colors</v-list-item-title>
                  <Colors 
                    :color_name="mapColorCodeToName(selectedMetadata.card.colorIdentities)" 
                    :size="20"
                  />
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-book-open-variant</v-icon>
                  </template>
                  <v-list-item-title>Set</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedMetadata.card.set_name || 'Unknown' }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Metadata Details -->
      <v-row class="mt-4">
        <v-col cols="12">
          <v-expansion-panels variant="accordion">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-2" color="info">mdi-database</v-icon>
                Metadata Details
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item v-if="selectedMetadata.metadata?.scryfallId">
                    <v-list-item-title>Scryfall ID</v-list-item-title>
                    <v-list-item-subtitle class="font-mono">{{ selectedMetadata.metadata.scryfallId }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item v-if="selectedMetadata.metadata?.tcgplayerProductId">
                    <v-list-item-title>TCGPlayer ID</v-list-item-title>
                    <v-list-item-subtitle>{{ selectedMetadata.metadata.tcgplayerProductId }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item v-if="selectedMetadata.metadata?.frameVersion">
                    <v-list-item-title>Frame Version</v-list-item-title>
                    <v-list-item-subtitle>{{ selectedMetadata.metadata.frameVersion }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item v-if="selectedMetadata.metadata?.borderColor">
                    <v-list-item-title>Border Color</v-list-item-title>
                    <v-list-item-subtitle>{{ selectedMetadata.metadata.borderColor }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item v-if="selectedMetadata.metadata?.hasFoil !== undefined">
                    <v-list-item-title>Foil Available</v-list-item-title>
                    <v-list-item-subtitle>
                      <v-chip :color="selectedMetadata.metadata.hasFoil ? 'success' : 'default'" size="small">
                        {{ selectedMetadata.metadata.hasFoil ? 'Yes' : 'No' }}
                      </v-chip>
                    </v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item v-if="selectedMetadata.metadata?.tcgplayerPurchaseUrl">
                    <v-btn
                      :href="selectedMetadata.metadata.tcgplayerPurchaseUrl"
                      target="_blank"
                      color="primary"
                      variant="outlined"
                      prepend-icon="mdi-cart"
                      class="mt-2"
                    >
                      Buy on TCGPlayer
                    </v-btn>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-col>
      </v-row>

      <!-- Pricing Table -->
      <v-row class="mt-4">
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title>
              <v-icon class="mr-2" color="success">mdi-currency-usd</v-icon>
              Pricing Information
            </v-card-title>
            <v-divider />
            <v-data-table
              :headers="priceHeaders"
              :items="priceItems"
              :items-per-page="10"
              density="comfortable"
              class="elevation-0"
            >
              <template v-slot:item.price="{ item }">
                <span class="font-weight-bold text-success">{{ item.priceFormatted }}</span>
              </template>

              <template v-slot:no-data>
                <v-alert type="info" variant="tonal" class="ma-4">
                  No pricing data available
                </v-alert>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      <!-- Deck Usage Table -->
      <v-row class="mt-4">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title>
              <v-icon class="mr-2" color="warning">mdi-cards-playing</v-icon>
              Deck Usage
            </v-card-title>
            <v-divider />
            <v-data-table
              :headers="deckHeaders"
              :items="deckItems"
              :items-per-page="10"
              density="comfortable"
              class="elevation-0"
            >
              <template v-slot:item.deck_name="{ item }">
                <span class="font-weight-medium">
                {{ item.deck_name }}
                <v-btn :to="`/decks/${item.deck_id}`" icon="mdi-open-in-new" variant="text" />
                </span>
              </template>
              <template v-slot:item.format="{ item }">
                <v-chip size="small" color="primary" variant="tonal">
                  {{ item.format }}
                </v-chip>
              </template>

              <template v-slot:item.archetype="{ item }">
                <v-chip size="small" color="secondary" variant="tonal">
                  {{ item.archetype }}
                </v-chip>
              </template>

              <template v-slot:item.card_count="{ item }">
                <span class="font-weight-bold">{{ item.card_count }}x</span>
              </template>

              <template v-slot:item.external_link="{ item }">
                <v-btn
                  v-if="item.external_link"
                  :href="item.external_link"
                  target="_blank"
                  icon="mdi-open-in-new"
                  size="small"
                  variant="text"
                  color="primary"
                />
              </template>

              <template v-slot:no-data>
                <v-alert type="info" variant="tonal" class="ma-4">
                  This card is not used in any tracked decks
                </v-alert>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
        <!-- Collection Info -->
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title>
              <v-icon class="mr-2" color="secondary">mdi-package-variant</v-icon>
              Collection Info
            </v-card-title>
            <v-divider />
            <v-card-text>
              <div class="text-h6 mb-4">
                Total Owned: <span class="text-primary">{{ selectedMetadata.total_owned || 0 }}</span>
              </div>

              <div v-if="enrichedPrintings.length">
                <div class="text-subtitle-2 mb-2">Related Printings ({{ enrichedPrintings.length }}):</div>
                <v-list density="compact" max-height="300" class="overflow-y-auto">
                  <v-list-item
                    v-for="print in enrichedPrintings"
                    :key="print.id"
                    :title="`${magicSetData?.[print.set_name]?.set_code ?? 'Promo Set'} - ${print.set_full_name ?? print.set_name}`"
                    :subtitle="`#${print.number_in_set ?? print.id} • Released ${print.release_date}`"
                    @click="selectPrintingFromList(print)"
                    class="cursor-pointer"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small">mdi-cards</v-icon>
                    </template>
                  </v-list-item>
                </v-list>

                <v-btn
                  :to="`/collection/view/${selectedMetadata.card.id}`"
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-folder-open"
                  block
                  class="mt-4"
                >
                  View in Collection
                </v-btn>
              </div>

              <v-alert v-else type="info" variant="tonal" class="mt-2">
                No related printings found
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<style scoped>
.reprint-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.reprint-card:hover {
  transform: translateY(-4px);
}

.font-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.h-100 {
  height: 100%;
}

.card-image-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(0, 0, 0, 0.4) !important;
  color: white !important;
  opacity: 0.7;
  transition: opacity 0.2s ease-in-out;
}

.carousel-arrow:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.6) !important;
}

.carousel-arrow-left {
  left: 8px;
}

.carousel-arrow-right {
  right: 8px;
}

.flip-button {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgba(33, 150, 243, 0.9) !important;
  color: white !important;
  z-index: 5;
  transition: all 0.2s ease-in-out;
}

.flip-button:hover {
  background-color: rgba(33, 150, 243, 1) !important;
  transform: rotate(180deg);
}
</style>