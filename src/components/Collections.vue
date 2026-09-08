<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ProcessedSetData } from '@/composables/useMagicSetData'
import { 
  createNewCollection, 
  deleteCollectionFromServer, 
  importCollectionFromExternalSource, 
  pollServerForImportStatus, 
  retrieveCollections,
  updateCollectionData,
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
const listOfCollections = computed(() => {
  return [...rawCollections.value].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) {
      return a.is_favorite ? -1 : 1
    }
    return a.collection_name.localeCompare(b.collection_name)
  })
})
const selectedCollection = ref<number | null>(null)

// Layout & UI State
const isViewingCollection = ref(false)
const dedupe = ref(true)
const selectedMode = ref('merge')
const importSummary = ref<string | null>(null)
const isImporting = ref(false)
const toastMessage = ref('')
const toastColor = ref('success')
const showToast = ref(false)
const previousQuery = ref<Record<string, any>>({})

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

// Deletion State
const deleteDialog = ref(false)
const deleteSnackbar = ref(false)
const collectionToDelete = ref<any>(null)
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

const tab = ref('View Collections') 
const tabLabels = ['Create Collection', 'Add to Collections', 'View Collections']

const newCollectionFields = reactive({
  name: '',
  description: ''
})

const scrollAnchor = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const modeOptions = [
  { title: 'Merge with Existing', value: 'merge', subtitle: 'Add to existing card counts' },
  { title: 'Set Count', value: 'set', subtitle: 'Override existing card counts' },
  { title: 'Create New', value: 'new', subtitle: 'Create new entries only' }
]

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
    },
    page: currentPage.value
  }
})

// Centralized Router State Updater
function applyFiltersToUrl(pageOverride?: number) {
  console.log('[DEBUG applyFiltersToUrl] Called. isSyncingFromRoute:', isSyncingFromRoute.value, 'selectedCollection:', selectedCollection.value)
  if (isSyncingFromRoute.value || !selectedCollection.value) {
    console.log('[DEBUG applyFiltersToUrl] ABORTED due to guard flag or missing selectedCollection.')
    return
  }

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

  console.warn('[DEBUG applyFiltersToUrl] Executing router.push to:', `/collections/${selectedCollection.value}`, query)
  console.trace() // Shows who called applyFiltersToUrl

  router.replace({
    path: `/collections/${selectedCollection.value}`,
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

watch(tab, (newTab, oldTab) => {
  console.log(`[DEBUG Tab Watcher] Changed from "${oldTab}" -> "${newTab}". route.params.id:`, route.params.id)
  if (newTab === 'View Collections') {
    setupIntersectionObserver()
  } else if (oldTab === 'View Collections' && route.params.id) {
    console.warn('[DEBUG Tab Watcher] Switched away from View Collections. Triggering router.push(/collections)')
    console.trace() // Shows who/what changed tab
    isViewingCollection.value = false
    selectedCollection.value = null
    router.push({ path: '/collections' })
  }
})

// Single Master Watcher: Syncs URL to UI & Fetches Data
watch(
  () => [route.params.id, route.query],
  async (val) => {
    // Suppress destructuring error if watcher payload is empty/undefined
    if (!val || !Array.isArray(val)) return

    const [newId, newQuery] = val
    
    // FIX: Grab the snapshot saved BEFORE this router push occurred
    const oldQuery = previousQuery.value

    console.log('[DEBUG Master Watcher] Fired!', { newId, newQuery, oldQuery })

    const rawId = route.params.id ? String(route.params.id) : null
    const collectionId = rawId ? parseInt(rawId, 10) : null

    if (!collectionId || isNaN(collectionId)) {
      console.warn('[DEBUG Master Watcher] No valid collectionId!')
      isViewingCollection.value = false
      selectedCollection.value = null
      return
    }

    isSyncingFromRoute.value = true
    selectedCollection.value = collectionId
    isViewingCollection.value = true
    tab.value = 'View Collections'

    syncUiFromQuery((newQuery as Record<string, any>) || route.query)

    if (!setData.value.length) {
      loadSetData().then(() => {
        const q = (newQuery as Record<string, any>) || route.query
        const urlSets = q['filters[sets]'] ? (q['filters[sets]'] as string).split(',') : []
        if (urlSets.length && setData.value.length) {
          selectedSets.value = setData.value.filter(item => urlSets.includes(item.value))
        }
      }).catch(() => {})
    }

    // Correctly check if ONLY the page number incremented
    const isPagePush =
      oldQuery &&
      newQuery &&
      newQuery.page &&
      Number(newQuery.page) > 1 &&
      String(newQuery.page) !== String(oldQuery.page) &&
      (newQuery['filters[search]'] || '') === (oldQuery['filters[search]'] || '')

    // IMPORTANT: Take a snapshot copy of newQuery for the NEXT watcher tick
    previousQuery.value = { ...newQuery }

    if (isPagePush) {
      await loadMoreCards()
    } else {
      await refreshFilteredCards()
    }

    await nextTick()
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
  if (!selectedCollection.value) return

  isLoading.value = true
  try {
    const response = await viewCardsInCollection(selectedCollection.value, queryParams.value)
    cardsInCollection.value = response.data.data || []
    totalValueOfSelected.value = response.data.aggregations?.filtered?.market_value || 0
    
    const meta = response.data.meta
    hasMore.value = meta ? meta.current_page < meta.last_page : false
    
    computeGlobalColorCounts(cardsInCollection.value)
  } catch (error) {
    console.error('Failed to fetch filtered cards:', error)
    cardsInCollection.value = []
  } finally {
    isLoading.value = false
  }
}

const loadMoreCards = async () => {
  if (!hasMore.value || isLoading.value || !selectedCollection.value) return

  isLoading.value = true
  try {
    const targetPage = Number(route.query.page) || (currentPage.value + 1)

    const params = {
      ...queryParams.value,
      page: targetPage,
    }

    const response = await viewCardsInCollection(selectedCollection.value, params)
    const newCards = response.data.data || []

    // Deduplicate and append new cards onto existing list
    const cardMap = new Map(cardsInCollection.value.map(card => [card.id, card]))
    newCards.forEach((card: any) => cardMap.set(card.id, card))
    cardsInCollection.value = Array.from(cardMap.values())

    // Sync active page state
    currentPage.value = targetPage

    const meta = response.data.meta
    hasMore.value = meta ? meta.current_page < meta.last_page : false
  } catch (error) {
    console.error('Error loading cards:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchCollections = async () => {
  try {
    const response = await retrieveCollections()
    rawCollections.value = response.map((collection: Collection) => collection) || []
  } catch (error) {
    console.error('Error fetching collections:', error)
  }
}

async function patchCollection(collection: Collection, changes) {
  // 1. Store previous state for optimistic rollback if needed
  const originalState = { ...collection }

  // 2. Optimistically apply change to UI immediately (snappy UX)
  Object.assign(collection, changes)

  try {
    // 3. Send ONLY the changed key(s) to Laravel
    const updatedCollection = await updateCollectionData(collection.id, changes)
    
    // 4. Sync backend response back to local object
    Object.assign(collection, updatedCollection)
  } catch (error) {
    // Revert UI on error
    Object.assign(collection, originalState)
    console.error('Failed to update collection:', error)
    // Optional: show snackbar notification here
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
    const price = card.is_foil
      ? card.card_from_set?.card_metadata?.prices?.usd_foil
      : card.card_from_set?.card_metadata?.prices?.usd
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

const viewCollection = (collectionId: number) => {
  router.push({ path: `/collections/${collectionId}` })
}

const backToCollections = () => {
  isViewingCollection.value = false
  selectedCollection.value = null
  router.push({ path: '/collections' })
}

function onColorFilterChange(newColors: string[]) {
  activeColors.value = newColors
  applyFiltersToUrl(1)
}

const submitImport = async () => {
  if (!csvFile.value || !selectedCollection.value) return
  isImporting.value = true
  const formData = new FormData()
  formData.append('csv', csvFile.value)
  formData.append('collection_id', String(selectedCollection.value))
  formData.append('mode', selectedMode.value)
  const isDedupe = Boolean(dedupe.value)
  formData.append('dedupe', isDedupe ? '1' : '0')
  console.log('Submitting import with dedupe:', isDedupe)

  await importCollectionFromExternalSource(formData)
  pollImportStatus(selectedCollection.value)
}

const pollImportStatus = async (collectionId: number) => {
  const interval = setInterval(async () => {
    const { data } = await pollServerForImportStatus(collectionId)
    if (data.status === 'complete') {
      clearInterval(interval)
      toastMessage.value = 'Import complete!'
      showToast.value = true
      isImporting.value = false
    } else if (data.status === 'failed') {
      clearInterval(interval)
      toastMessage.value = 'Import failed. Check logs for details.'
      toastColor.value = 'error'
      showToast.value = true
      isImporting.value = false
    }
  }, 3000)
}

const createCollection = async () => {
  if (!newCollectionFields.name.trim()) return
  try {
    await createNewCollection({
      name: newCollectionFields.name,
      description: newCollectionFields.description
    })
    newCollectionFields.name = ''
    newCollectionFields.description = ''
    await fetchCollections()
  } catch (error) {
    console.error('Error creating collection:', error)
  }
}

function confirmDelete(collection: any) {
  collectionToDelete.value = collection
  deleteDialog.value = true
}

async function deleteCollection() {
  try {
    await deleteCollectionFromServer(collectionToDelete.value.id)
    listOfCollections.value = listOfCollections.value.filter(
      c => c.id !== collectionToDelete.value.id
    )
    deleteSnackbar.value = true
  } catch (error) {
    console.error('Failed to delete collection:', error)
  } finally {
    deleteDialog.value = false
    collectionToDelete.value = null
  }
}

// Fixed onMounted: Load collections immediately without waiting on set metadata
onMounted(() => {
  fetchCollections()
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
      (entries) => {
        const entry = entries[0]
        if (
          entry.isIntersecting && 
          hasMore.value && 
          !isLoading.value && 
          isViewingCollection.value &&
          cardsInCollection.value.length > 0
        ) {
          applyFiltersToUrl(currentPage.value + 1)
        }
      },
      { 
        root: null,
        rootMargin: '200px',
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
    <!-- Header Card -->
    <v-card class="collections-header-card mb-6">
        <v-toolbar color="transparent" class="px-4">
            <v-icon icon="mdi-folder-multiple" class="mr-3" size="28"></v-icon>
            <v-toolbar-title class="text-h4 font-weight-bold">Collection Management</v-toolbar-title>
            
            <template v-slot:extension>
                <v-tabs 
                    v-model="tab" 
                    align-tabs="center"
                    color="primary"
                    slider-color="primary"
                    class="collections-tabs"
                >
                    <v-tab 
                        v-for="label in tabLabels" 
                        :key="label" 
                        :value="label"
                        class="tab-item"
                    >
                        <v-icon 
                            :icon="label === 'Create Collection' ? 'mdi-plus-circle' : 
                                  label === 'Add to Collections' ? 'mdi-upload' : 'mdi-view-list'"
                            class="mr-2"
                        ></v-icon>
                        {{ label }}
                    </v-tab>
                </v-tabs>
            </template>
        </v-toolbar>
    </v-card>

    <!-- Tab Content -->
    <v-window v-model="tab" transition="fade-transition">
        <!-- Create Collection Tab -->
        <v-window-item value="Create Collection">
            <v-card class="collection-form-card">
                <v-card-text class="pa-8">
                    <div class="form-header mb-6"f>
                        <h2 class="text-h5 font-weight-bold text-primary mb-2">
                            <v-icon icon="mdi-plus-circle" class="mr-2"></v-icon>
                            Create New Collection
                        </h2>
                        <p class="text-body-1 text-medium-emphasis">
                            Set up a new Magic card collection to organize and track your cards
                        </p>
                    </div>

                    <v-form class="collection-form">
                        <v-text-field
                            v-model="newCollectionFields.name"
                            label="Collection Name"
                            placeholder="Enter a name for your collection..."
                            variant="outlined"
                            density="comfortable"
                            prepend-inner-icon="mdi-folder"
                            class="mb-4"
                            :rules="[v => !!v || 'Collection name is required']"
                            required
                        ></v-text-field>

                        <v-textarea
                            v-model="newCollectionFields.description"
                            label="Description"
                            placeholder="Describe your collection (optional)..."
                            variant="outlined"
                            density="comfortable"
                            prepend-inner-icon="mdi-text"
                            rows="4"
                            class="mb-6"
                        ></v-textarea>

                        <div class="form-actions">
                            <v-btn
                                @click="createCollection"
                                color="primary"
                                size="large"
                                variant="elevated"
                                prepend-icon="mdi-plus"
                                :disabled="!newCollectionFields.name.trim()"
                                class="create-btn"
                            >
                                Create Collection
                            </v-btn>
                        </div>
                    </v-form>
                </v-card-text>
            </v-card>
        </v-window-item>

        <!-- Add to Collections Tab -->
        <v-window-item value="Add to Collections">
            <v-card class="import-form-card">
                <v-card-text class="pa-8">
                    <div class="form-header mb-6">
                        <h2 class="text-h5 font-weight-bold text-primary mb-2">
                            <v-icon icon="mdi-upload" class="mr-2"></v-icon>
                            Import Cards to Collection
                        </h2>
                        <p class="text-body-1 text-medium-emphasis">
                            Upload a CSV file to add cards to your existing collection
                        </p>
                    </div>

                    <v-form class="import-form">
                        <!-- Collection Selection -->
                        <v-snackbar v-model="showToast" :timeout="3000" :color="toastColor" >
                        {{ toastMessage }}
                        </v-snackbar>                         
                        <v-select
                        v-model="selectedCollection"
                        :items="listOfCollections"
                        item-title="collection_name"
                        item-value="id"
                        label="Choose Collection"
                        placeholder="Select a collection..."
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-folder-open"
                        class="mb-4"
                        :rules="[v => !!v || 'Please select a collection']"
                        >
                        <!-- dropdown rows -->
                        <template v-slot:item="{ props, item }">
                            <v-list-item v-bind="props">
                            <v-list-item-title>{{ item.collection_name }}</v-list-item-title>
                            <v-list-item-subtitle v-if="item.description">
                                {{ item.description }}
                            </v-list-item-subtitle>
                            </v-list-item>
                        </template>

                        <!-- selected label -->
                        <template v-slot:selection="{ item }">
                            <span v-if="item">{{ item.collection_name }}</span>
                        </template>
                        </v-select>

                        <!-- Import Mode Selection -->
                        <v-select
                            v-model="selectedMode"
                            :items="modeOptions"
                            label="Import Mode"
                            placeholder="Choose how to handle existing cards..."
                            variant="outlined"
                            density="comfortable"
                            prepend-inner-icon="mdi-cog"
                            class="mb-4"
                        >
                            <template v-slot:item="{ props, item }">
                                <v-list-item v-bind="props">
                                    <v-list-item-title>{{ item.title }}</v-list-item-title>
                                    <v-list-item-subtitle>{{ item.subtitle }}</v-list-item-subtitle>
                                </v-list-item>
                            </template>
                        </v-select>

                        <!-- File Upload -->
                        <v-file-input
                            v-model="csvFile"
                            label="Upload CSV File"
                            placeholder="Choose a CSV file..."
                            accept=".csv"
                            variant="outlined"
                            density="comfortable"
                            prepend-inner-icon="mdi-file-upload"
                            prepend-icon=""
                            class="mb-6"
                            :rules="[v => !!v || 'Please select a CSV file']"
                        ></v-file-input>

                        <div>
                          <input type="checkbox" id=dedupeCheck v-model="dedupe" />
                          <label for="dedupeCheck">Dedupe Cards on Import</label>
                        </div>

                        <!-- Action Buttons -->
                        <div class="form-actions">
                            <v-btn
                                @click="submitImport"
                                :disabled="!csvFile || !selectedCollection || isImporting"
                                :loading="isImporting"
                                color="primary"
                                size="large"
                                variant="elevated"
                                prepend-icon="mdi-upload"
                                class="import-btn"
                            >
                                {{ isImporting ? 'Importing...' : 'Import Cards' }}
                            </v-btn>
                        </div>
                    </v-form>

                    <!-- Import Results -->
                    <v-card 
                        v-if="importSummary" 
                        class="mt-6 import-results"
                        variant="outlined"
                    >
                        <v-card-title class="text-h6 font-weight-bold">
                            <v-icon icon="mdi-information" class="mr-2"></v-icon>
                            Import Summary
                        </v-card-title>
                        <v-card-text>
                            <pre class="import-summary-text">{{ importSummary }}</pre>
                        </v-card-text>
                    </v-card>
                </v-card-text>
            </v-card>
        </v-window-item>

        <!-- View Collections Tab -->
        <v-window-item value="View Collections">
          <v-card class="collections-view-card elevation-1" variant="flat">
            <!-- Reduced container padding to prevent desktop blowout -->
            <v-card-text class="pa-3 pa-md-6">
              
              <!-- LEVEL 1: List of Collections -->
              <div v-if="!isViewingCollection">
                <!-- Grid optimized for desktop density: 4 cards/row on lg, 6 on xl -->
                <v-row v-if="listOfCollections.length > 0" dense>
                  <v-col 
                    v-for="collection in listOfCollections" 
                    :key="collection.id" 
                    cols="12" 
                    sm="6" 
                    md="4" 
                    lg="3" 
                    xl="2"
                  >
                      <v-card class="collection-item-card position-relative d-flex flex-column justify-space-between h-100" variant="outlined">
                      <!-- Top Header Action Row (Favorite + Menu) -->
                      <div class="d-flex align-center justify-space-between pa-3 pb-0">
                        <div class="d-flex align-center ga-1 flex-wrap">
                          <v-chip size="x-small" color="primary" variant="tonal" class="text-uppercase font-weight-bold">
                            {{ collection.game_type || 'MTG' }}
                          </v-chip>
                          <v-chip size="x-small" variant="outlined" class="text-capitalize text-medium-emphasis">
                            {{ collection.type || 'Collection' }}
                          </v-chip>
                        </div>

                        <!-- Action Buttons Container (In-flow flex layout instead of absolute) -->
                        <div class="d-flex align-center">
                          <v-btn
                            size="x-small"
                            variant="text"
                            :color="collection.is_favorite ? 'error' : 'medium-emphasis'"
                            :icon="collection.is_favorite ? 'mdi-heart' : 'mdi-heart-outline'"
                            @click.stop="patchCollection(collection, { is_favorite: !collection.is_favorite })"
                          />
                          
                          <v-menu location="bottom end">
                            <template v-slot:activator="{ props }">
                              <v-btn v-bind="props" variant="text" size="x-small" icon="mdi-dots-vertical" color="medium-emphasis" />
                            </template>
                            <v-list density="compact" min-width="130">
                              <v-list-item @click="openEditModal(collection)" prepend-icon="mdi-pencil-outline">
                                <v-list-item-title>Edit</v-list-item-title>
                              </v-list-item>
                              <v-divider />
                              <v-list-item @click="confirmDelete(collection)" prepend-icon="mdi-delete-outline" color="error">
                                <v-list-item-title class="text-error">Delete</v-list-item-title>
                              </v-list-item>
                            </v-list>
                          </v-menu>
                        </div>
                      </div>

                      <v-card-text class="pa-4 pr-12 d-flex flex-column justify-space-between h-100">
                        <div>
                          <!-- Title & Description -->
                          <h3 class="text-h6 font-weight-bold mb-1 text-truncate" :title="collection.collection_name">
                            {{ collection.collection_name }}
                          </h3>
                          
                          <p v-if="collection.description" class="text-body-2 text-medium-emphasis text-clamp-2 mb-4">
                            {{ collection.description }}
                          </p>
                          <p v-else class="text-body-2 text-disabled font-italic mb-4">
                            No description provided
                          </p>
                        </div>

                        <!-- Metrics Row -->
                        <div class="metrics-row d-flex align-center ga-3 pt-2 border-t">
                          <div class="d-flex flex-column">
                            <span class="text-caption text-medium-emphasis">Unique</span>
                            <span class="text-subtitle-2 font-weight-bold">{{ collection.total_unique_cards || 0 }}</span>
                          </div>
                          
                          <v-divider vertical class="my-1" />

                          <div class="d-flex flex-column">
                            <span class="text-caption text-medium-emphasis">Total Cards</span>
                            <span class="text-subtitle-2 font-weight-bold">{{ collection.total_cards || 0 }}</span>
                          </div>
                        </div>
                      </v-card-text>

                      <!-- Card Actions Footer -->
                      <v-card-actions class="pa-4 pt-0 d-flex align-center justify-space-between">
                        <v-btn
                          variant="flat"
                          color="primary"
                          size="small"
                          prepend-icon="mdi-cards-outline"
                          @click="viewCollection(collection.id)"
                        >
                          View Cards
                        </v-btn>

                        <!-- Inventory Toggle Action -->
                        <v-tooltip :text="collection.include_in_inventory ? 'Included in Active Inventory' : 'Excluded from Inventory'" location="top">
                          <template v-slot:activator="{ props }">
                            <v-btn
                              v-bind="props"
                              size="small"
                              variant="tonal"
                              :color="collection.include_in_inventory ? 'success' : 'grey-darken-1'"
                              :icon="collection.include_in_inventory ? 'mdi-archive-check' : 'mdi-archive-cancel-outline'"
                              @click.stop="patchCollection(collection, { include_in_inventory: !collection.include_in_inventory })"
                            />
                          </template>
                        </v-tooltip>
                      </v-card-actions>
                    </v-card>
                  </v-col>
                  <v-dialog v-model="deleteDialog" max-width="500">
                    <v-card>
                        <v-card-title class="text-h6 font-weight-bold">
                        Delete Collection
                        </v-card-title>
                        <v-card-text>
                        Are you sure you want to delete <strong>{{ collectionToDelete?.name }}</strong>? This action cannot be undone.
                        </v-card-text>
                        <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
                        <v-btn color="error" variant="elevated" @click="deleteCollection">Delete</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>                    
                </v-row>
                <v-empty-state v-else icon="mdi-folder-plus" title="No Collections Yet" />
              </div>

              <!-- LEVEL 2: Cards Section (Shows when isViewingCollection === true) -->
              <div v-else class="cards-section">
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