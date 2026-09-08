<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { CardDisplay, Colors } from '@/interfaces';
import { getColorManaCost, getNumericalManaCost, mapColorCodeToName} from '../utils/deckUtils'
import { useCsvExport, CsvColumn } from '../composables/useCsvExport';
import { callConsolidatedCardsSearch, getSetData, searchCardsByName, searchSetsByRarities } from '@/api/cardClient';
import { useSiteWideRouter } from '@/composables/useSitewideRouter';
import type { Card, CardBackendData } from '@/utils/types';
import type { CardSearchParams } from '@/api/cardClient';

const desktopGridMinWidths: Record<'sm' | 'md' | 'lg', string> = {
  sm: '140px',
  md: '200px',
  lg: '280px'
}

const currentImageSize = ref<'sm' | 'md' | 'lg'>('lg')
const gridMinWidth = computed(() => desktopGridMinWidths[currentImageSize.value as 'sm' | 'md' | 'lg'])

const { routeToCardMetadata } = useSiteWideRouter();

interface ProcessedSetData {
  value: string;
  title: string;
  official_set_name: string;
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

const processedCardData = ref<any[]>([])
const tableLoadKey = ref(0)
const searchText = ref("")
const itemsPerPage = ref(10)
const dynamicListName = ref("")

const viewMode = ref<'table' | 'grid'>('table')   // default to table
const imageSize = ref<'sm' | 'md' | 'lg'>('md')   // default to medium

// CSV Export composable
const { downloadCsv } = useCsvExport<any>()

const setData = ref<ProcessedSetData[]>([])
const selectedSets = ref<ProcessedSetData[]>([])
const setSearchText = ref('')
const setCombobox = ref<any>(null)

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

const allHeaders = ref([
    { title: 'Name', key: 'name', value: 'name', width: '300px' },
    { title: 'Set', key: 'set_name', value: 'set_name', width: '300px' },
    { title: 'Release Date', key: 'release_date', value: 'release_date', width: '150px' },
    { title: 'Type', key: 'type', value: 'type', width: '300px' },
    { title: 'Colors', key: 'colors', value: 'colors' },
    { title: 'Mana Cost', key: 'mana_cost', value: 'mana_cost', width: '200px' },
    { title: 'Image', key: 'image_url', value: 'image_url' },
    { title: 'Text', key: 'card_text', value: 'card_text', width: '500px' },
    { title: 'Price', key: 'price_usd', value: 'price_usd', width: '100px' },
])

const serverSortKey = ref<'name' | 'price' | 'release_date' | 'set' | 'count'>('name')
const serverSortDirection = ref<'asc' | 'desc'>('asc')

const serverSortOptions = [
  { title: 'Card Name', value: 'name' },
  { title: 'Price', value: 'price' },
  { title: 'Release Date', value: 'release_date' },
  { title: 'Set Code', value: 'set' },
]

const dateRangeText = ref('')

const searchParams = computed<CardSearchParams>(() => {
  const range = parseDateRange(dateRangeText.value)

  return {
    name: searchText.value,
    sets: selectedSets.value.map(set => set.value).join(','),
    rarities: selectedRarity.value.join(','),
    colors: colorFilterParam.value,
    limit: limitToRetrieve.value,
    date_start: range.start,
    date_end: range.end,
    sort: {
      key: serverSortKey.value,
      direction: serverSortDirection.value
    }
  }
})

const exportDialog = ref(false)
const selectedExportFormat = ref<'default' | 'manabox'>('default')

const exportFormats = [
  { title: 'Default CSV', value: 'default', subtitle: 'Standard card collection layout' },
  { title: 'Manabox CSV', value: 'manabox', subtitle: 'Formatted specifically for ManaBox app imports' }
]

function openExportModal() {
  if (filteredCardData.value.length === 0) {
    return alert('No data to export')
  }
  exportDialog.value = true
}

function processAndDownloadCsv() {
  if (selectedExportFormat.value === 'manabox') {
    const columnsManabox: CsvColumn<any>[] = [
      { key: 'name', label: 'card name' },
      { key: 'set_name', label: 'set code' },
      { key: 'official_set_name', label: 'set name' },
      { key: 'number_in_set', label: 'card number' },
      { key: 'language', label: 'language' },
      { key: 'is_foil', label: 'foil' },
      { key: 'quantity', label: 'quantity' },
      { key: 'scryfall_id', label: 'Scryfall ID' },
      { key: 'price_usd', label: 'purchase price' },
      { key: 'purchase_currency', label: 'purchase currency' },
    ]
    downloadCsv(filteredCardData.value, columnsManabox, 'mtg_cards_manabox_export.csv')
  } else {
    const columnsDefault: CsvColumn<any>[] = [
      { key: 'name', label: 'Name' },
      { key: 'set_name', label: 'Set code' },
      { key: 'number_in_set', label: 'Collector number' },
      { key: 'is_foil', label: 'Foil' },
      { key: 'rarity', label: 'Rarity' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'scryfall_id', label: 'Scryfall ID' },
      { key: 'price_usd', label: 'Purchase price' },
    ]
    downloadCsv(filteredCardData.value, columnsDefault, 'mtg_cards_export.csv')
  }

  exportDialog.value = false
}

function selectTopSet() {
// 1. If there is search text, select the top matched set item
  if (setSearchText.value && setSearchText.value.trim().length > 0) {
    const filtered = setCombobox.value?.filteredItems || []

    if (filtered.length > 0) {
      const topItem = filtered[0].raw ?? filtered[0]

      nextTick(() => {
        // Remove raw text strings inserted by v-combobox default behavior
        const cleanedList = selectedSets.value.filter(s => typeof s !== 'string')

        // Add object if not already selected
        const exists = cleanedList.some(s => s.value === topItem.value)
        if (!exists) {
          cleanedList.push(topItem)
        }

        selectedSets.value = cleanedList
        setSearchText.value = ''
      })
    }
    return
  }

  // 2. If search text is empty (second Enter press), execute the search
  searchAgainstSetData()
}

const setNameMap = computed<Record<string, string>>(() => 
setData.value.reduce((acc, { value, official_set_name }) => {
    acc[value] = official_set_name
        return acc
    }, {} as Record<string, string>)
)

onMounted(() => {
    getSetDataAsync()
})

async function getSetDataAsync() {
    const setDataResponse = await getSetData()
    setData.value = setDataResponse
}

function processRawCardData(data: CardBackendData[]) {
    processedCardData.value = data.map(card => {
        const rawCost = card.mana_cost ?? ''

        // NEW: backend returns colors as a string like "R"
        const colorLetters = typeof card.colors === 'string'
            ? card.colors.split('')
            : Array.isArray(card.colors)
                ? card.colors
                : []

        const colors = colorLetters.map(letter => colorMap[letter] ?? 'colorless')

        return {
            id: card.id,
            name: card.name,
            set_name: card.set_name,
            official_set_name: setNameMap.value[card.set_name],
            type: card.type,
            image_url: card.image_url,
            mana_cost: rawCost,
            mana_numeric: getNumericalManaCost(rawCost),
            mana_colors: getColorManaCost(rawCost),

            // NEW: backend does not return oracle_text or text
            card_text: card.oracle_text ?? card.text ?? '',

            colors,
            price_usd: card.prices?.usd ? Number(card.prices.usd) : null,
            price_usd_foil: card.prices?.usd_foil ? Number(card.prices.usd_foil) : null,
            release_date: card.release_date,
            scryfall_id: card.scryfall_id,
            number_in_set: card.number_in_set,
            rarity: card.rarity,

            card_from_set: card
        }
    })
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

function parseDateRange(input: string): { start?: string; end?: string } {
  if (!input) return {}

  const parts = input.split('-').map(p => p.trim())

  // Case 1: single date → start = parsed date, end = today
  if (parts.length === 1) {
    const start = new Date(parts[0])
    if (!isNaN(start.getTime())) {
      return {
        start: start.toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10)
      }
    }
    return {}
  }

  // Case 2: two dates → start and end
  if (parts.length === 2) {
    const start = new Date(parts[0])
    const end = new Date(parts[1])

    return {
      start: !isNaN(start.getTime()) ? start.toISOString().slice(0, 10) : undefined,
      end: !isNaN(end.getTime()) ? end.toISOString().slice(0, 10) : undefined
    }
  }

  return {}
}

async function searchByName() {
    if (selectedRarity.value.length === 0) {
        selectedRarity.value = ['common', 'uncommon', 'rare', 'mythic']
    }
    const cardDataResponse = await searchCardsByName(searchText.value, selectedRarity.value.join(','));
    processRawCardData(cardDataResponse.data);
}

async function searchAgainstSetData() {
    if (selectedRarity.value.length === 0) {
        selectedRarity.value = ['common', 'uncommon', 'rare', 'mythic'];
    }

    const cardDataResponse = await callConsolidatedCardsSearch(searchParams.value);
    processRawCardData(cardDataResponse.data.data);
}

function handleRowClick(_evt: MouseEvent, row: { item: { card_from_set?: CardBackendData } }) {
  const backendData = row.item.card_from_set
  if (!backendData) return
  routeToCardMetadata({ card_from_set: backendData } as Card)
}

const clientSortKey = ref<'name' | 'price_usd' | 'release_date'>('name')
const clientSortDir = ref<'asc' | 'desc'>('asc')

function toggleClientSort(key: 'name' | 'price_usd' | 'release_date') {
  if (clientSortKey.value === key) {
    clientSortDir.value = clientSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    clientSortKey.value = key
    clientSortDir.value = 'asc'
  }
  tableLoadKey.value++ // Forces Vuetify table DOM reset
}

// Wrap filteredCardData in a client-sorted computed block
const sortedFilteredCardData = computed(() => {
  const list = [...filteredCardData.value]
  const key = clientSortKey.value
  const isAsc = clientSortDir.value === 'asc'

  return list.sort((a, b) => {
    const valA = a[key]
    const valB = b[key]

    // Empty checks
    const isAEmpty = valA === null || valA === undefined || valA === ''
    const isBEmpty = valB === null || valB === undefined || valB === ''
    if (isAEmpty && isBEmpty) return 0
    if (isAEmpty) return 1
    if (isBEmpty) return -1

    let diff = 0

    if (key === 'release_date') {
      const timeA = Date.parse(valA) || 0
      const timeB = Date.parse(valB) || 0
      diff = timeA - timeB
    } else if (key === 'price_usd') {
      diff = (Number(valA) || 0) - (Number(valB) || 0)
    } else {
      diff = String(valA).localeCompare(String(valB))
    }

    return isAsc ? diff : -diff
  })
})
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
            class="search-input mb-4" prepend-inner-icon="mdi-magnify" @keyup.enter="searchAgainstSetData" clearable />

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
                      ref="setCombobox"
                      v-model="selectedSets"
                      v-model:search="setSearchText"
                      :items="setData"
                      item-title="title"
                      item-value="value"
                      label="Magic Sets"
                      placeholder="Select sets to search in..."
                      variant="outlined"
                      density="comfortable"
                      multiple
                      chips
                      clearable
                      @keydown.enter.prevent="selectTopSet"
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
                      max="1000" />
                  </v-col>
                </v-row>

                <!-- Action Buttons -->
                <div class="filter-actions mt-4">
                  <v-btn 
                    @click="searchAgainstSetData"
                    color="primary"
                    size="large"
                    prepend-icon="mdi-magnify"
                    class="mr-3">
                    Search Cards
                  </v-btn>
                  
                  <v-btn 
                    @click="openExportModal"
                    color="secondary"
                    variant="outlined"
                    size="large"
                    prepend-icon="mdi-download">
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
  <v-toolbar flat class="mb-4 px-2 bg-surface rounded-lg border">
    <!-- View Mode Switchers -->
    <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
      <v-btn value="table" icon="mdi-table" title="Table View" />
      <v-btn value="grid" icon="mdi-view-grid" title="Grid View" />
    </v-btn-toggle>

    <!-- Image Size Options (Grid View Only) -->
    <v-btn-toggle
      v-if="viewMode === 'grid'"
      v-model="currentImageSize"
      mandatory
      density="compact"
      class="ml-3"
    >
      <v-btn value="sm">SM</v-btn>
      <v-btn value="md">MD</v-btn>
      <v-btn value="lg">LG</v-btn>
    </v-btn-toggle>
    <v-spacer />
    <v-text-field v-model="dateRangeText" label="Release Date Range (YYYY-MM-DD - YYYY-MM-DD)" variant="outlined" density="compact" class="ml-4" clearable />
    <v-spacer />
    <v-text-field v-model="dynamicListName" label="Dynamic List Name" variant="outlined" density="compact" class="ml-4" clearable />
    <v-spacer />

    <!-- 1. SERVER QUERY SORT (Re-runs search on change) -->
    <div class="d-flex align-center mr-4" style="max-width: 260px;">
      <v-select
        v-model="serverSortKey"
        :items="serverSortOptions"
        label="Query Sort"
        density="compact"
        variant="outlined"
        hide-details
        class="mr-1"
        @update:model-value="searchAgainstSetData"
      />
      <v-btn
        icon
        size="small"
        variant="text"
        @click="serverSortDirection = serverSortDirection === 'asc' ? 'desc' : 'asc'; searchAgainstSetData()"
      >
        <v-icon>
          {{ serverSortDirection === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending' }}
        </v-icon>
      </v-btn>
    </div>

    <v-divider vertical class="my-2 mr-4" />

    <!-- 2. CLIENT DISPLAY SORT (Flips loaded results instantly without network requests) -->
    <div class="d-flex align-center">
      <span class="text-caption text-medium-emphasis mr-2">Page Sort:</span>
      <v-btn
        size="small"
        variant="outlined"
        class="mr-1"
        :color="clientSortKey === 'price_usd' ? 'primary' : 'default'"
        @click="toggleClientSort('price_usd')"
      >
        Price
        <v-icon end size="x-small">
          {{ clientSortKey === 'price_usd' && clientSortDir === 'desc' ? 'mdi-arrow-down' : 'mdi-arrow-up' }}
        </v-icon>
      </v-btn>

      <v-btn
        size="small"
        variant="outlined"
        :color="clientSortKey === 'release_date' ? 'primary' : 'default'"
        @click="toggleClientSort('release_date')"
      >
        Date
        <v-icon end size="x-small">
          {{ clientSortKey === 'release_date' && clientSortDir === 'desc' ? 'mdi-arrow-down' : 'mdi-arrow-up' }}
        </v-icon>
      </v-btn>
    </div>
  </v-toolbar>
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
              class="ml-2">
              {{ filteredCardData.length }} cards
            </v-chip>
          </h3>
        </div>
      </v-card-title>

      <div v-if="viewMode === 'table'">
        <v-data-table
          :headers="allHeaders"
          :items="sortedFilteredCardData"
          :key="tableLoadKey"
          :items-per-page-options="itemsPerPageOptions"
          :items-per-page="itemsPerPage"
          @click:row="handleRowClick"
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
              <span class="mr-1 d-inline-flex">
                <Colors :mana_cost="item.mana_numeric" />
              </span>
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
          <!-- Card Price Column -->
          <template v-slot:item.price_usd="{ item }">
            <div class="d-flex flex-column text-caption">
              <div v-if="item.price_usd !== null" class="card-text-content">
                ${{ Number(item.price_usd).toFixed(2) }}
              </div>
              <div v-if="item.price_usd_foil !== null" class="card-text-content text-amber-darken-3">
                ${{ Number(item.price_usd_foil).toFixed(2) }} (Foil)
              </div>
            </div>
          </template>
        </v-data-table>
      </div>
      <div v-else class="card-grid" :style="{ '--desktop-min-width': gridMinWidth }">
        <CardDisplay
          v-for="card in sortedFilteredCardData"
          :key="card.id"
          :card="card"
          viewMode="grid"
          :imageSize="currentImageSize"
          :addToList="dynamicListName === '' ? 'false' : 'true'"
          :dynamicListName="dynamicListName"
        />
      </div>
    </v-card>
  </div>
<!-- Export Format Modal -->
<v-dialog v-model="exportDialog" max-width="500px">
  <v-card>
    <v-card-title class="text-h6 pa-4">
      <v-icon icon="mdi-file-export-outline" class="mr-2"></v-icon>
      Select Export Format
    </v-card-title>
    
    <v-divider></v-divider>
    
    <v-card-text class="pa-4">
      <v-radio-group v-model="selectedExportFormat" hide-details>
        <v-radio
          v-for="format in exportFormats"
          :key="format.value"
          :value="format.value"
          color="primary"
          class="mb-2"
        >
          <template #label>
            <div>
              <div class="font-weight-medium text-body-1">{{ format.title }}</div>
              <div class="text-caption text-medium-emphasis">{{ format.subtitle }}</div>
            </div>
          </template>
        </v-radio>
      </v-radio-group>
    </v-card-text>

    <v-divider></v-divider>

    <v-card-actions class="pa-4">
      <v-spacer></v-spacer>
      <v-btn
        variant="text"
        @click="exportDialog = false"
      >
        Cancel
      </v-btn>
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-download"
        @click="processAndDownloadCsv"
      >
        Download
      </v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>  
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

/* Adjust layout behavior based on size */
.card-grid.size-sm {
  gap: 12px;
}

.card-grid.size-md {
  gap: 16px;
}

.card-grid.size-lg {
  gap: 24px;
}

.cursor-pointer {
  cursor: pointer;
}
.card-grid {
  display: grid;
  width: 100%;
  
  /* Mobile: Always lock to 3 equal columns */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
}

/* Desktop: Use imageSize toggle to dictate min column width */
@media (min-width: 600px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(var(--desktop-min-width, 200px), 1fr));
    gap: 16px;
    padding: 16px;
  }
}
</style>