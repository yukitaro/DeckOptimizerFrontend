<script setup lang="ts">
import { computed, onMounted, ref, reactive } from 'vue';
import axios from 'axios';
import Colors from './Colors.vue';
import { getColorManaCost, getNumericalManaCost, mapColorCodeToName} from '../utils/deckUtils'
import type { MtgCard } from '../utils/types';
import { useCsvExport, CsvColumn } from '../composables/useCsvExport';

// Types for our component
interface SetDataItem {
  set_name: string;
  official_set_code: string;
  total_cards: string;
}

interface ProcessedSetData {
  value: string;
  title: string;
  official_set_name: string;
}

interface CardDataFromAPI {
  id: number;
  name: string;
  set_name: string;
  type: string;
  colorIdentities: string;
  mana_cost: string;
  image_url: string;
  text: string;
}

type ColorName = 'plains' | 'islands' | 'swamps' | 'mountains' | 'forests' | 'colorless';

const colorNames: ColorName[] = ['plains', 'islands', 'swamps', 'mountains', 'forests', 'colorless']

const rarities = [
  { value: 'common', label: 'Common', color: 'grey', icon: 'mdi-circle' },
  { value: 'uncommon', label: 'Uncommon', color: 'blue-grey', icon: 'mdi-triangle' },
  { value: 'rare', label: 'Rare', color: 'amber', icon: 'mdi-diamond' },
  { value: 'mythic', label: 'Mythic', color: 'deep-orange', icon: 'mdi-star' }
]

const itemsPerPageOptions = [
  { value: 10, title: '10 per page' },
  { value: 25, title: '25 per page' },
  { value: 50, title: '50 per page' },
  { value: 100, title: '100 per page' },
  { value: -1, title: 'All' }
]

const base_url = "http://localhost:80";
const processedCardData = ref<any[]>([])
const tableLoadKey = ref(0)
const searchText = ref("")
const itemsPerPage = ref(10)

// CSV Export composable
const { downloadCsv } = useCsvExport<any>()

const setData = ref<ProcessedSetData[]>([])
const selectedSets = ref<ProcessedSetData[]>([])

const limitToRetrieve = ref(100)

const selectedRarity = ref(['common', 'uncommon', 'rare', 'mythic'])
const colorsToggle = ref<Record<ColorName, boolean>>({
    plains: false,
    islands: false,
    swamps: false,
    mountains: false,
    forests: false,
    colorless: false,
})

const processedMtgCardData = ref<MtgCard[]>([])

const allHeaders = ref([
    { title: 'Name', value: 'name', width: '300px' },
    { title: 'Set', value: 'set_name', width: '300px' },
    { title: 'Type', value: 'type', width: '300px' },
    { title: 'Colors', value: 'colors' },
    { title: 'Mana Cost', value: 'mana_cost', width: '200px' },
    { title: 'Image', value: 'image_url' },
    { title: 'Text', value: 'card_text', width: '600px' },
])

function exportToCSV() {
  if (filteredCardData.value.length === 0) {
    return alert('No data to export')
  }
  
  // Define columns for CSV export
  const columns: CsvColumn<any>[] = [
    { key: 'name', label: 'Name' },
    { key: 'official_set_name', label: 'Set' },
    { key: 'rarity', label: 'Rarity' },
    { key: 'mana_cost', label: 'Mana Cost' },
    { key: 'type_line', label: 'Type' },
    { key: 'oracle_text', label: 'Text' }
  ]
  
  downloadCsv(filteredCardData.value, columns, 'mtg_cards_export.csv')
}

const setNameMap = computed<Record<string, string>>(() => 
setData.value.reduce((acc, { value, official_set_name }) => {
    acc[value] = official_set_name
        return acc
    }, {} as Record<string, string>)
)


onMounted(() => {
    getSetDataAsync()
    getCardDataAsync()
})

async function getCardDataAsync() {
    const cardDataResponse = await axios.get(`${base_url}/cardsJSON/40`)
    //cardDataAsync.value.push(...arguments(cardDataResponse.data || []))
    //cardDataAsync.value.cardData = cardDataResponse.data;
    processRawCardData(cardDataResponse.data)
}

async function getSetDataAsync() {
    const setDataResponse = await axios.get(`${base_url}/sets`)
    
    setData.value = setDataResponse.data.map((aSetsData: SetDataItem) => ({
        value: aSetsData.set_name,
        title: aSetsData.official_set_code + ' (' + aSetsData.set_name + ')',
        official_set_name: aSetsData.official_set_code
    }))
}

function processRawCardData(data: CardDataFromAPI[]) {
    processedCardData.value = data.map(cardDataVal => {
        // grab the raw string once
        const rawCost       = cardDataVal.mana_cost ?? ''
        // compute once up-front
        const mana_numeric  = getNumericalManaCost(rawCost)
        const mana_colors   = getColorManaCost(rawCost)

        const colorIdentitiesArray = Array.isArray(cardDataVal.colorIdentities)
            ? cardDataVal.colorIdentities
            : cardDataVal.colorIdentities
                ? cardDataVal.colorIdentities.split('') // Split string into individual letters
                : []

        // Map each color letter to color names and keep as array
        const colors = colorIdentitiesArray.length > 0
            ? colorIdentitiesArray
                .map(letter => colorMap[letter])
                .filter(Boolean) // Remove any undefined values
            : ['colorless'] // Explicitly assign colorless for cards with no color identity

        return {
            id: cardDataVal.id,
            name: cardDataVal.name,
            set_name: cardDataVal.set_name,
            official_set_name: setNameMap.value[cardDataVal.set_name],
            type: cardDataVal.type,
            colors: colors,
            mana_cost: rawCost,
            mana_numeric,   
            mana_colors,              
            image_url: cardDataVal.image_url ?? "",
            card_text: cardDataVal.text
        }   
    })
}


function convertColorToName(color: string): ColorName {
    switch (color) {
        case 'W': return 'plains'
        case 'U': return 'islands'
        case 'B': return 'swamps'
        case 'R': return 'mountains'
        case 'G': return 'forests'
        case '':
        case null:
        case undefined:
        default: return 'colorless'
    }
}

const colorMap: Record<string, ColorName> = {
  W: 'plains', U: 'islands', B: 'swamps', R: 'mountains', G: 'forests', C: 'colorless'
}    

function toggleColorFilters(colorValue: ColorName) {
    colorsToggle.value[colorValue] = !colorsToggle.value[colorValue];
}

const filteredCardData = computed(() => {
    const activeNames = Object.entries(colorsToggle.value)
        .filter(([_, on]) => on)
        .map(([name]) => name)

    // If no filters are active, return everything
    if (activeNames.length === 0) return processedCardData.value;

    // Otherwise, filter by matching card.colors (now an array)
    return processedCardData.value.filter(card => {
        // Check if the card has any colors that match the active filters
        return card.colors && card.colors.some((color: string) => activeNames.includes(color));
    });
});


const activeColors = computed(() =>
    Object.entries(colorsToggle.value)
    .filter(([_, isActive]) => isActive)
    .map(([key]) => {
        switch (key) {
            case "plains": return "W";
            case "islands": return "U";
            case "swamps": return "B";
            case "mountains": return "R";
            case "forests": return "G";
            case "colorless": return "C";
            default: return null;
        }
    }).filter(Boolean)
);
    
const colorFilterParam = computed(() => activeColors.value.join(','));

    // Color counts for current results (for badges and visual indicators)
const colorCounts = computed(() => {
  const counts = { plains: 0, islands: 0, swamps: 0, mountains: 0, forests: 0, colorless: 0 }
  
  filteredCardData.value.forEach((card: any) => {
    if (card.colors && card.colors.length > 0) {
      // If card has colors, count each one
      card.colors.forEach((colorName: string) => {
        if (counts.hasOwnProperty(colorName)) {
          counts[colorName as keyof typeof counts]++
        }
      })
    } else {
      // If no colors, count as colorless
      counts.colorless++
    }
  })
  return counts
})

function hasColorInResults(colorName: string): boolean {
    return colorCounts.value[colorName as keyof typeof colorCounts.value] > 0
}

function getColorCount(colorName: string): number {
    return colorCounts.value[colorName as keyof typeof colorCounts.value] || 0
}

async function searchByName() {
    if (selectedRarity.value.length === 0) {
        selectedRarity.value = ['common', 'uncommon', 'rare', 'mythic']
    }

    const cardDataResponse = await axios.get(`${base_url}/cards/name/${searchText.value}/rarities/${selectedRarity.value}`, {
        params: {
            limit: limitToRetrieve.value
        }
    });
    processRawCardData(cardDataResponse.data);
}

async function searchAgainstSetData() {
    if (selectedRarity.value.length === 0) {
        selectedRarity.value = ['common', 'uncommon', 'rare', 'mythic'];
    }

    if (searchText.value.length === 0) {
        const cardDataResponse = await axios.get(`${base_url}/cardsfromsets/${selectedSets.value[0].value}`, {
            params: {
                limit: limitToRetrieve.value,
                colorFilters: colorFilterParam.value
            }
        });
        processRawCardData(cardDataResponse.data);
    } else {

        const cardDataResponse = await axios.get(`${base_url}/cardsfromsets/name/${searchText.value}/rarities/${selectedRarity.value}`, {
            params: {
                limit: limitToRetrieve.value
            }
        });
        processRawCardData(cardDataResponse.data);
    }
}
 </script>

<template>
  <!-- Search Header -->
  <div class="search-header">
    <v-card class="search-card">
      <v-card-text class="pa-6">
        <div class="search-header-content">
          <h2 class="text-h4 font-weight-bold text-primary mb-4">Magic Card Search</h2>
          
          <!-- Main Search Bar -->
          <v-text-field v-model="searchText" label="Search for cards..." placeholder="Lightning Bolt, Counterspell, etc." variant="outlined" density="comfortable"
            class="search-input mb-4" prepend-inner-icon="mdi-magnify" @keyup.enter="searchByName" clearable />

          <!-- Filter Controls -->
          <v-expansion-panels class="mb-4" variant="accordion">
            <v-expansion-panel>
              <v-expansion-panel-title class="text-h6">
                <v-icon icon="mdi-filter-variant" class="mr-2"></v-icon>
                Advanced Filters
              </v-expansion-panel-title>
              
              <v-expansion-panel-text>
                <v-row>
                  <!-- Color Filters -->
                  <v-col cols="12" md="6">
                    <h3 class="text-h6 mb-3">Colors</h3>
                    <div class="color-filters">
                      <v-btn v-for="(colorName, index) in colorNames" :key="index" :variant="colorsToggle[colorName] ? 'elevated' : 'outlined'"
                            :color="colorsToggle[colorName] ? 'primary' : 'default'" :class="{ 'color-unavailable': !hasColorInResults(colorName) && getColorCount(colorName) === 0 }"
                            class="color-filter-btn ma-1" @click="toggleColorFilters(colorName)">
                        <Colors :color_name="colorName" />
                        <v-badge v-if="getColorCount(colorName) > 0" :content="getColorCount(colorName)" color="success" floating />
                      </v-btn>
                    </div>
                  </v-col>

                  <!-- Rarity Filters -->
                  <v-col cols="12" md="6">
                    <h3 class="text-h6 mb-3">Rarity</h3>
                    <div class="rarity-filters">
                      <v-chip-group v-model="selectedRarity" multiple>
                        <v-chip  v-for="rarity in rarities" :key="rarity.value" :value="rarity.value" :color="rarity.color" variant="outlined" filter>
                          <v-icon :icon="rarity.icon" start></v-icon>
                          {{ rarity.label }}
                        </v-chip>
                      </v-chip-group>
                    </div>
                  </v-col>
                </v-row>

                <v-row class="mt-4">
                  <!-- Set Selection -->
                  <v-col cols="12" md="8">
                    <v-combobox
                      v-model="selectedSets"
                      :items="setData"
                      label="Magic Sets"
                      placeholder="Select sets to search in..."
                      variant="outlined"
                      density="comfortable"
                      multiple
                      chips
                      clearable
                    />
                  </v-col>

                  <!-- Limit -->
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="limitToRetrieve"
                      label="Result Limit"
                      type="number"
                      variant="outlined"
                      density="comfortable"
                      min="1"
                      max="1000"
                    />
                  </v-col>
                </v-row>

                <!-- Action Buttons -->
                <div class="filter-actions mt-4">
                  <v-btn 
                    @click="searchAgainstSetData"
                    color="primary"
                    size="large"
                    prepend-icon="mdi-magnify"
                    class="mr-3"
                  >
                    Search Cards
                  </v-btn>
                  
                  <v-btn 
                    @click="exportToCSV"
                    color="secondary"
                    variant="outlined"
                    size="large"
                    prepend-icon="mdi-download"
                  >
                    Export CSV
                  </v-btn>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-card-text>
    </v-card>
  </div>

  <!-- Results Section -->
  <div class="results-section">
    <v-card class="results-card">
      <v-card-title class="results-header">
        <div class="d-flex align-center justify-space-between w-100">
          <h3 class="text-h5">
            Search Results 
            <v-chip 
              v-if="filteredCardData.length > 0" 
              color="primary" 
              variant="elevated"
              class="ml-2"
            >
              {{ filteredCardData.length }} cards
            </v-chip>
          </h3>
        </div>
      </v-card-title>

      <v-data-table
        :headers="allHeaders"
        :items="filteredCardData"
        :key="tableLoadKey"
        :items-per-page-options="itemsPerPageOptions"
        :items-per-page="itemsPerPage"
        class="elevation-0"
        hover
      >
        <!-- Card Image Column -->
        <template v-slot:item.image_url="{ item }">
          <Popper hover arrow placement="right">
            <v-avatar size="48" class="card-thumbnail">
              <v-img :src="item.image_url" alt="Card thumbnail" />
            </v-avatar>
            <template #content>
              <div class="card-preview">
                <v-img 
                  :src="item.image_url" 
                  alt="Full card"
                  width="250"
                  aspect-ratio="0.714"
                />
              </div>
            </template>
          </Popper>
        </template>

        <!-- Colors Column -->
        <template v-slot:item.colors="{ item }">
          <div class="d-flex align-center">
            <Colors 
              v-for="(name, idx) in item.colors" 
              :key="idx" 
              :color_name="name"
              class="mr-1" 
            />
          </div>
        </template>

        <!-- Mana Cost Column -->
        <template v-slot:item.mana_cost="{ item }">
          <div class="mana-cost-display d-flex align-center">
            <Colors :mana_cost="item.mana_numeric" class="mr-1" />
            <span
              v-for="(c, idx) in item.mana_colors"
              :key="idx"
              class="color-symbol mr-1"
            >
              <Colors :color_name="mapColorCodeToName(c)" />
            </span>
          </div>
        </template>

        <!-- Card Text Column -->
        <template v-slot:item.card_text="{ item }">
          <div class="card-text-cell">
            <div class="card-text-content">{{ item.card_text }}</div>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<style scoped>
/* Search Header Styling */
.search-header {
  margin-bottom: 24px;
}

.search-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.search-input :deep(.v-field) {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* Filter Controls */
.color-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-filter-btn {
  border-radius: 8px !important;
  min-width: 48px;
  height: 48px;
}

.rarity-filters :deep(.v-chip) {
  border-radius: 8px;
}

.filter-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

/* Results Section */
.results-section {
  margin-top: 24px;
}

.results-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.results-header {
  padding: 24px 24px 0 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

/* Table Styling */
.card-thumbnail {
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.card-thumbnail:hover {
  transform: scale(1.1);
}

.card-preview {
  padding: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.mana-cost-display {
  min-height: 32px;
}

.card-text-cell {
  max-width: 400px;
}

.card-text-content {
  font-size: 0.875rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

/* Color filter states */
:deep(.v-badge__wrapper) {
  position: relative;
}

:deep(.v-badge__badge) {
  font-size: 0.75rem;
  min-width: 18px;
  height: 18px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .search-card .v-card-text {
    padding: 16px !important;
  }
  
  .filter-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-actions .v-btn {
    width: 100%;
    margin: 4px 0;
  }
}
</style>