<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ProcessedSetData } from '@/composables/useMagicSetData'
import { 
  retrieveInventory,
  viewCardsInCollection 
} from '@/api/collection'
import { useSiteWideRouter } from '@/composables/useSitewideRouter'
import { useSetData } from '@/composables/useMagicSetData'
import ImageSizeSelector from '@/components/widgets/ImageSizeSelector.vue'
import { Collection } from '@/utils/types'

// Image sizing configuration
type SizeKey = 'sm' | 'md' | 'lg';

const desktopGridMinWidths: Record<SizeKey, string> = {
  sm: '120px',
  md: '160px',
  lg: '220px'
};
const currentImageSize = ref<SizeKey>('md');

const { routeToCardMetadata } = useSiteWideRouter()
const route = useRoute()
const router = useRouter()
const isSyncingFromRoute = ref(false)

const csvFile = ref<File | null>(null)
const rawCollections = ref<Collection[]>([])
const selectedCollection = ref<number | null>(null)

// Layout & UI State
const isViewingCollection = ref(false)
const collectionReturnToLocation = ref('')

// Card Data & Pagination State
const cardsInCollection = ref<any[]>([])
const currentPage = ref(1)
const hasMore = ref(true)
const isLoading = ref(false)
const shouldExcludeMultiColor = ref(false)

// Filter & Sort State
const searchTerm = ref('')
const sortKey = ref('price')
const sortDirection = ref('desc')
const activeColors = ref<string[]>([])
const groupByName = ref(false)

const totalValueOfSelected = ref(0)

// Set Picker & Combobox State
const setMTGSetsSearchText = ref('')
const dynamicListName = ref("")
const selectedSets = ref<ProcessedSetData[]>([])
const { setData, loadSetData, isLoading: isSetDataLoading } = useSetData()
const selectedSetComboBox = ref<any>(null)

const selectedRarities = ref(['common', 'uncommon', 'rare', 'mythic'])
const rarities = [
  { value: 'common', label: 'Common', color: 'grey', icon: 'mdi-circle' },
  { value: 'uncommon', label: 'Uncommon', color: 'blue-grey', icon: 'mdi-triangle' },
  { value: 'rare', label: 'Rare', color: 'amber', icon: 'mdi-diamond' },
  { value: 'mythic', label: 'Mythic', color: 'deep-orange', icon: 'mdi-star' }
]

const globalColorCounts = ref<Record<string, number>>({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 })

const tab = ref('View Inventory') 
  
const scrollAnchor = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// Construct backend request payload from reactive states
const queryParams = computed(() => {
  const setCodes = selectedSets.value
    .map(set => {
      if (typeof set === 'string') return set
      return set?.value?.value || set?.value || set?.raw?.value || null
    })
    .filter(Boolean)
    .join(',')

  return {
    sort: {
      key: sortKey.value,
      direction: sortDirection.value
    },
    filters: {
      colors: activeColors.value,
      sets: setCodes,
      rarities: selectedRarities.value,
      excludeMultiColor: shouldExcludeMultiColor.value,
      search: searchTerm.value,
    }
  }
})

function isSameFilterState(q1: Record<string, any>, q2: Record<string, any> = {}) {
  const keys = [
    'sort[key]',
    'sort[direction]',
    'filters[search]',
    'filters[sets]',
    'filters[colors]',
    'filters[rarities]',
    'filters[excludeMultiColor]'
  ]
  return keys.every(key => (q1[key] || '') === (q2[key] || ''))
}

// Centralized Router State Updater
function applyFiltersToUrl(pageOverride?: number) {
  if (isSyncingFromRoute.value) return

  const targetPage = pageOverride ?? currentPage.value

  const setCodes = selectedSets.value
    .map(set => {
      if (typeof set === 'string') return set
      return set?.value?.value || set?.value || set?.raw?.value || set?.title || null
    })
    .filter(Boolean)
    .join(',')

  const query: Record<string, any> = {
    page: targetPage > 1 ? targetPage : undefined,
    'sort[key]': sortKey.value,
    'sort[direction]': sortDirection.value,
    'filters[search]': searchTerm.value || undefined,
    'filters[sets]': setCodes || undefined,
    'filters[colors]': activeColors.value.length ? activeColors.value.join(',') : undefined,
    'filters[rarities]': selectedRarities.value.length ? selectedRarities.value.join(',') : undefined,
    'filters[excludeMultiColor]': shouldExcludeMultiColor.value ? 'true' : undefined,
  }

  Object.keys(query).forEach(key => query[key] === undefined && delete query[key])

  router.replace({
    path: '/inventory',
    query
  }).catch(() => {})
}

// Combobox Top Match Selector
function selectTopSet() {
  if (setMTGSetsSearchText.value && setMTGSetsSearchText.value.trim().length > 0) {
    const filtered = selectedSetComboBox.value?.filteredItems || []

    if (filtered.length > 0) {
      const topItem = filtered[0].raw ?? filtered[0]

      nextTick(() => {
        const cleanedList = selectedSets.value.filter(s => typeof s !== 'string')
        const exists = cleanedList.some(s => s.value === topItem.value)
        if (!exists) {
          cleanedList.push(topItem)
        }
        selectedSets.value = [...cleanedList]
        setMTGSetsSearchText.value = ''
      })
    }
    return
  }

  searchAgainstSetData()
}

function searchAgainstSetData() {
  applyFiltersToUrl(1)
}

watch(
  () => route.query,
  async (newQuery, oldQuery) => {
    if (isSyncingFromRoute.value) return

    const newPage = Number(newQuery.page) || 1
    const oldPage = Number(oldQuery?.page) || 1

    // Page-only forward step (e.g. user scrolled down or used browser navigation)
    if (newPage !== oldPage && isSameFilterState(newQuery, oldQuery)) {
      if (newPage <= currentPage.value) return

      isSyncingFromRoute.value = true
      syncUiFromQuery(newQuery)
      await loadMoreCards(newPage)
      isSyncingFromRoute.value = false
      return
    }

    // Filter/Sort change or Initial Load: Reset back to page 1
    isSyncingFromRoute.value = true
    syncUiFromQuery(newQuery)
    await refreshFilteredCards()
    isSyncingFromRoute.value = false
  },
  { immediate: true }
)

function syncUiFromQuery(q: Record<string, any>) {
  console.log('[DEBUG syncUiFromQuery] Hydrating controls with query:', q)
  currentPage.value = Number(q.page) || 1
  sortKey.value = (q['sort[key]'] as string) || 'price'
  sortDirection.value = (q['sort[direction]'] as string) || 'desc'
  searchTerm.value = (q['filters[search]'] as string) || ''
  shouldExcludeMultiColor.value = q['filters[excludeMultiColor]'] === 'true'

  if (q['filters[colors]']) {
    activeColors.value = (q['filters[colors]'] as string).split(',')
  } else {
    activeColors.value = []
  }

  if (q['filters[rarities]']) {
    selectedRarities.value = (q['filters[rarities]'] as string).split(',')
  } else {
    selectedRarities.value = ['common', 'uncommon', 'rare', 'mythic']
  }

  const urlSets = q['filters[sets]'] ? (q['filters[sets]'] as string).split(',') : []
  if (urlSets.length) {
    if (setData.value.length) {
      selectedSets.value = setData.value.filter(item => urlSets.includes(item.value))
    } else {
      selectedSets.value = urlSets.map(code => ({ title: code, value: code })) as any[]
    }
  } else {
    selectedSets.value = []
  }
}

async function refreshFilteredCards() {
  isLoading.value = true
  try {
    const response = await retrieveInventory({
      ...queryParams.value,
      page: 1
    })
    
    const payload = response.data?.data ? response.data : response
    cardsInCollection.value = payload.data || []
    totalValueOfSelected.value = payload.aggregations?.global?.market_value || 0
    
    currentPage.value = 1
    const meta = payload.meta
    hasMore.value = meta ? meta.current_page < meta.last_page : false
    
    computeGlobalColorCounts(cardsInCollection.value)
  } catch (error) {
    console.error('Failed to fetch filtered cards:', error)
    cardsInCollection.value = []
  } finally {
    isLoading.value = false
  }
}

const loadMoreCards = async (targetPageOverride?: number) => {
  const nextPage = targetPageOverride ?? (currentPage.value + 1)
  if (!hasMore.value || isLoading.value) return

  isLoading.value = true
  try {
    const params = {
      ...queryParams.value,
      page: nextPage
    }

    const response = await retrieveInventory(params)
    const payload = response.data?.data ? response.data : response
    const newCards = payload.data || []

    // Map-based deduplication by unique card ID
    const cardMap = new Map(cardsInCollection.value.map(card => [card.id, card]))
    newCards.forEach((card: any) => cardMap.set(card.id, card))
    cardsInCollection.value = Array.from(cardMap.values())

    currentPage.value = nextPage

    const meta = payload.meta
    hasMore.value = meta ? meta.current_page < meta.last_page : newCards.length > 0
  } catch (error) {
    console.error('Error loading inventory cards:', error)
  } finally {
    isLoading.value = false
  }
}

function computeGlobalColorCounts(cards: any[]) {
  const counts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }
  for (const card of cards) {
    const raw = card.card_from_set?.colorIdentities || ''
    const codes = typeof raw === 'string' ? raw.split(',').map(c => c.trim()) : Array.isArray(raw) ? raw : []

    if (codes.length === 0) {
      counts['C']++
    } else {
      for (const code of codes) {
        if (counts[code] !== undefined) counts[code]++
      }
    }
  }
  globalColorCounts.value = counts
}

const calculateFilteredCardTotalValue = (): number => {
  return cardsInCollection.value.reduce((total, card) => {
      const price = card.card_from_set.card_metadata?.variant_prices[0].price
    return total + (price ? Number(price) * card.card_count : 0)
  }, 0)
}

const filteredCardTotalValue = computed(() => calculateFilteredCardTotalValue())

const filteredAndSortedCards = computed(() => {
  return cardsInCollection.value ? [...cardsInCollection.value] : []
})

const groupedCards = computed(() => {
  const cards = filteredAndSortedCards.value || []
  if (!groupByName.value) return cards

  const map = new Map<string, any>()
  for (const card of cards) {
    const name = card.card_from_set?.name || 'Unknown'
    if (!map.has(name)) {
      map.set(name, { ...card, card_count: card.card_count, variants: [card] })
    } else {
      const existing = map.get(name)
      existing.card_count += card.card_count
      existing.variants.push(card)
    }
  }
  return Array.from(map.values())
})

const backToCollections = () => {
  isViewingCollection.value = false
  selectedCollection.value = null
  router.push({ path: '/collections' })
}

function onColorFilterChange(newColors: string[]) {
  activeColors.value = newColors
  applyFiltersToUrl(1)
}

const fetchInventory = async () => {
  try {
    const response = await retrieveInventory()
    rawCollections.value = response.data || response || []
  } catch (error) {
    console.error('Error fetching collections:', error)
  }
}

// Fixed onMounted: Load collections immediately without waiting on set metadata
onMounted(() => {
  //fetchInventory()
  if (!setData.value.length) {
    loadSetData()
  }
  setupIntersectionObserver()
})

function setupIntersectionObserver() {
  if (observer) observer.disconnect()

  nextTick(() => {
    if (!scrollAnchor.value) return

    observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (
          entry.isIntersecting &&
          hasMore.value &&
          !isLoading.value &&
          cardsInCollection.value.length > 0
        ) {
          // Directly load the next page of cards
          loadMoreCards()
        }
      },
      {
        root: null,
        rootMargin: '300px',
        threshold: 0.1
      }
    )

    observer.observe(scrollAnchor.value)
  })
}

watch(scrollAnchor, (el) => {
  if (el) setupIntersectionObserver()
})

const gridMinWidth = computed(() => desktopGridMinWidths[currentImageSize.value as SizeKey] || '160px')
</script>

<template>
    <!-- Tab Content -->
    <v-window v-model="tab" transition="fade-transition">
        <!-- View Collections Tab -->
        <v-window-item value="View Inventory">
          <v-card class="collections-view-card elevation-1" variant="flat">
            <!-- Reduced container padding to prevent desktop blowout -->
            <v-card-text class="pa-3 pa-md-6">
              <!-- LEVEL 2: Cards Section (Shows when isViewingCollection === true) -->
              <div class="cards-section">
                <!-- Back Button -->
                <v-btn 
                  @click="backToCollections()"
                  variant="outlined"
                  prepend-icon="mdi-arrow-left"
                  class="mb-4"
                >
                  Back to Collections
                </v-btn>
                <ImageSizeSelector v-model="currentImageSize" class="d-none d-sm-flex" />
                <!-- Search and Sort Controls Card (ALWAYS VISIBLE WHEN VIEWING A COLLECTION) -->
                <v-card class="mb-4" variant="outlined">
                  <v-card-text class="pa-4">
                    <v-row>
                      <!-- Search Term Field -->
                      <v-col cols="12" md="8">
                        <v-text-field
                          v-model="searchTerm"
                          label="Search cards..."
                          variant="outlined"
                          density="comfortable"
                          prepend-inner-icon="mdi-magnify"
                          clearable
                        ></v-text-field>
                      </v-col>

                      <!-- Sort By Dropdown -->
                      <v-col cols="10" md="3">
                        <v-select
                          v-model="sortKey"
                          :items="[
                            { title: 'Price', value: 'price' },
                            { title: 'Name', value: 'name' },
                            { title: 'Count', value: 'count' },
                            { title: 'Condition', value: 'condition' }
                          ]"
                          label="Sort by"
                          variant="outlined"
                          density="comfortable"
                        ></v-select>
                      </v-col>

                      <!-- Sort Direction Toggle -->
                      <v-col cols="2" md="1">
                        <v-btn 
                          @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'" 
                          variant="outlined" 
                          icon
                        >
                          <v-icon v-if="sortDirection === 'asc'">mdi-arrow-up</v-icon>
                          <v-icon v-else>mdi-arrow-down</v-icon>
                        </v-btn>
                      </v-col>
                    </v-row>

                    <v-row>
                      <!-- Color Filters -->
                      <v-col cols="12" md="6">
                        <h3 class="text-h6 mb-3">Colors</h3>
                        <div class="color-filters">
                          <ColorFilterChips
                            :filteredCardData="filteredAndSortedCards"
                            :activeColors="activeColors"
                            :globalColorCounts="globalColorCounts"
                            @update:activeColors="onColorFilterChange"
                          />
                        </div>
                      </v-col>

                      <!-- Checkbox Options -->
                      <v-col cols="12" md="6">
                        <v-row>
                          <v-col class="pa-2">
                            <v-checkbox v-model="shouldExcludeMultiColor" label="Exclude Multicolor" />
                          </v-col>
                          <v-col class="pa-2">
                            <v-switch v-model="groupByName" label="Group by Card Name" color="primary" />
                          </v-col>
                        </v-row>
                      </v-col>

                      <!-- Rarity Filters -->
                      <v-col cols="12" md="6">
                        <h3 class="text-h6 mb-3">Rarity</h3>
                        <div class="rarity-filters">
                          <v-chip-group v-model="selectedRarities" multiple>
                            <v-chip  
                              v-for="rarity in rarities" 
                              :key="rarity.value" 
                              :value="rarity.value" 
                              :color="rarity.color" 
                              variant="outlined" 
                              filter
                            >
                              <v-icon :icon="rarity.icon" start></v-icon>
                              {{ rarity.label }}
                            </v-chip>
                          </v-chip-group>
                        </div>
                      </v-col>

                      <!-- Magic Set Selection -->
                      <v-col cols="12" md="6">
                        <h3 class="text-h6 mb-3">Sets</h3>
                        <v-combobox
                          ref="selectedSetComboBox"
                          v-model="selectedSets"
                          v-model:search="setMTGSetsSearchText"
                          :items="setData"
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
                    </v-row>

                    <v-row class="align-center justify-space-between mt-2 pa-3">
                      <!-- Filter Action Button -->
                      <div class="filter-actions">
                        <v-btn 
                          @click="searchAgainstSetData"
                          color="primary"
                          size="large"
                          prepend-icon="mdi-magnify"
                        >
                          Search Cards
                        </v-btn>
                      </div>                                

                      <!-- Filter Value Summary -->
                      <div class="filter-summary text-right">
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          Showing {{ filteredAndSortedCards.length }} cards
                          (Displayed Value: ${{ filteredCardTotalValue.toFixed(2) }})
                        </p>
                        <p class="text-caption text-medium-emphasis mb-0">
                          Collection Value: ${{ totalValueOfSelected.toFixed(2) }}
                        </p>
                      </div>
                    </v-row>
                  </v-card-text>
                </v-card>

                <!-- Initial Load Indicator -->
                <div v-if="isLoading && cardsInCollection.length === 0" class="text-center py-8">
                  <v-progress-circular indeterminate color="primary" size="48" />
                  <p class="mt-2 text-medium-emphasis">Fetching cards...</p>
                </div>

                <!-- No Search Results Found -->
                <v-empty-state
                  v-else-if="!isLoading && filteredAndSortedCards.length === 0"
                  icon="mdi-magnify-minus"
                  title="No Cards Found"
                  text="Try adjusting your filter settings or search terms."
                  class="py-8"
                />

                <!-- Cards Display Area -->
                <div v-else>
                  <div 
                    class="card-grid" :style="{ '--desktop-min-width': gridMinWidth }">
                    <CardDisplay
                      v-for="card in groupedCards"
                      :key="card.id"
                      :card="card"
                      mode="collection"
                      viewMode="grid"
                      :imageSize="currentImageSize"
                      :addToList="dynamicListName === '' ? 'false' : 'true'"
                      :dynamicListName="dynamicListName"
                      :returnToLocation="collectionReturnToLocation || route.fullPath"
                    />
                  </div>

                  <!-- Infinite Scroll Anchor / Pagination Loading --> 
                  <div ref="scrollAnchor" class="scroll-anchor py-4 text-center">
                    <v-progress-circular v-if="isLoading" indeterminate color="primary" />
                    <span v-else-if="!hasMore && cardsInCollection.length > 0" class="text-caption text-medium-emphasis">
                      End of collection
                    </span>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-window-item>
    </v-window>
</template>

<style scoped>
/* Base View Wrapper */
.collections-view-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.3);
}

/* Card Styling & Hover Effects */
.collection-item-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    border-color: rgba(var(--v-border-color), 0.12);
    background: #ffffff;
}

.collection-item-card:hover {
    transform: translateY(-3px);
    border-color: rgba(var(--v-theme-primary), 0.4);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08) !important;
}

/* Micro Typography & Utilities */
.text-xxs {
    font-size: 0.6875rem;
    line-height: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
}

.text-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    min-height: 2.2em;
}

.border-t {
    border-top: 1px solid rgba(var(--v-border-color), 0.08);
}

/* Grid & Scroll Utilities */
.scroll-anchor {
    min-height: 50px;
    width: 100%;
}

.card-item {
    width: 100%;
    max-width: none !important;
    flex: none !important;
    transition: all 0.2s ease-in-out;
}

.card-grid {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    padding: 4px;
}

@media (min-width: 600px) {
    .card-grid {
        grid-template-columns: repeat(auto-fill, minmax(var(--desktop-min-width, 200px), 1fr));
        gap: 16px;
        padding: 16px;
    }
}
</style>