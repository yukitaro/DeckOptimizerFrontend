<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getColorManaCost, getNumericalManaCost, mapColorCodeToName} from '../utils/deckUtils'
import Colors from './Colors.vue';
import { useCardMetadata } from '@/composables/useCardMetadata';

const router = useRouter()

const {
  selectedMetadata, enrichedPrintings, priceItems, deckItems, priceMap, loading, error,
  loadCardMetadata, searchCards, reprints, selectPrinting, clearSelection, currentPrinting,
  currentPrintingIndex, currentImageUrl, isDFC, showBackFace, toggleCardFace, previousPrinting,
  nextPrinting, selectPrintingFromList, magicSetData, priceMapById
} = useCardMetadata();

const searchText = ref('');

function parseSetNameFromFinish(finish) {
  const match = finish.match(/(\w*)\s+#/);
  return match ? match[1] : null;
}

const props = defineProps({
  cardId: { type: [String, Number], default: null },
  cardSlug: { type: String, default: null },
  cardSet: { type: String, default: null },
  cardNumberInSet: { type: String, default: null }
});

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

function doSearch() {
  searchCards(searchText.value);
}

function switchToDeckDisplay(deck) {
  if (!deck) return

  const rawDeck = deck?._custom?.value || deck
  const deckId = rawDeck?.deck_id

  if (!deckId) {
    console.warn('Cannot switch: deck_id is missing from', deck)
    return
  }  
  router.push({
    name: 'Decks',
    params: { deckId: String(deckId) },
    query: { tab: 'Deck Display 2' }
  })
}

onMounted(async () => {
  try {
    if (props.cardId && props.cardSet && props.cardSlug && props.cardNumberInSet) {
        await loadCardMetadata({
          cardId: props.cardId,
          cardSet: props.cardSet,
          cardSlug: props.cardSlug,
          cardNumberInSet: props.cardNumberInSet
        });
    }
  }
  catch (error) {
    console.error('Error loading card metadata on mount:', error);
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
              @keyup.enter="doSearch"
              density="comfortable"
            />
            <v-btn
              color="primary"
              size="large"
              block
              :disabled="loading || !searchText.trim()"
              :loading="loading"
              @click="doSearch">
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
      <v-row class="mt-2 stats-row" align="stretch" dense>
        <v-col
          v-for="stat in cardStats"
          :key="stat.label"
          cols="12"
          sm="6"
          md="4"
          lg="2"
          class="stat-col"
        >
          <v-card :color="stat.color" variant="tonal" class="stat-card">
            <v-card-text class="stat-card-text">
              <div class="stat-content d-flex align-center justify-space-between">
                <div class="stat-text">
                  <div class="stat-value">{{ stat.value }}</div>
                  <div class="stat-label">{{ stat.label }}</div>
                </div>
                <v-icon class="stat-icon" :color="stat.color">{{ stat.icon }}</v-icon>
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
                  Price :
                  {{
                    priceMapById[currentPrinting?.id]?.price != null
                      ? priceMapById[currentPrinting.id].priceFormatted
                      : 'N/A'
                  }}
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
            <v-data-table :headers="priceHeaders" :items="priceItems" :items-per-page="10" density="comfortable" class="elevation-0">
              <template v-slot:item.finish="{ item }">
                <div class="font-weight-medium">
                  {{ (magicSetData[parseSetNameFromFinish(item.finish)]?.set_code ?? 'Promo Set') + ' - ' + (item.finish ?? '') }}
                </div>
              </template>
              <template v-slot:item.price="{ item }">
                <span class="font-weight-bold text-success">{{ item.priceFormatted }}</span>
                <div class="text-caption">
                  <a v-if="item.tcgplayerUrl" :href="item.tcgplayerUrl" target="_blank">TCGPlayer</a>
                  <span v-if="item.tcgplayerUrl && item.cardKingdomUrl"> · </span>
                  <a v-if="item.cardKingdomUrl" :href="item.cardKingdomUrl" target="_blank">CardKingdom</a>
                </div>
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
                <v-btn @click="switchToDeckDisplay(item)" icon="mdi-open-in-new" variant="text" />
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

/* Responsive stat card styles */
.stat-card { height: 100%; }
.stat-card-text { padding: 12px; }
.stat-value { font-size: 1.15rem; font-weight: 600; }
.stat-label { font-size: 0.85rem; color: rgba(0,0,0,0.65); }
.stat-icon { font-size: 28px; line-height: 1; }

/* Larger icons on wider screens */
@media (min-width: 960px) {
  .stat-value { font-size: 1.35rem; }
  .stat-icon { font-size: 40px; }
  .stat-card-text { padding: 16px; }
}

/* Tighter layout on small screens */
@media (max-width: 600px) {
  .stats-row { gap: 8px; }
  .stat-card-text { padding: 8px; }
  .stat-value { font-size: 1.05rem; }
  .stat-icon { font-size: 24px; }
}

/* Make image container and arrows friendlier on mobile */
.card-image-container .v-img { max-width: 220px; }
@media (min-width: 960px) {
  .card-image-container .v-img { max-width: 265px; }
}
.carousel-arrow { width: 40px; height: 40px; font-size: 20px; }
@media (min-width: 960px) { .carousel-arrow { width: 52px; height: 52px; font-size: 28px; } }

/* Tone down flip-button transform on mobile (avoid heavy rotation) */
.flip-button { transition: background-color 0.2s ease, transform 0.18s ease; }
@media (max-width: 600px) { .flip-button:hover { transform: none; } }

/* header cell */
.tbl-header {
  background: linear-gradient(180deg, rgba(250,250,250,0.98), rgba(242,242,242,0.98));
  color: rgba(0,0,0,0.85);
  font-weight: 600;
  font-size: 0.95rem;
  text-transform: none; /* or uppercase if you prefer */
  border-bottom: 1px solid rgba(0,0,0,0.08);
  padding: 10px 12px; /* slightly tighter */
}

/* right aligned header adjustments */
.tbl-header-right { text-align: right; }

/* keep header visually lifted from rows */
.v-data-table thead .tbl-header {
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.04);
}
</style>