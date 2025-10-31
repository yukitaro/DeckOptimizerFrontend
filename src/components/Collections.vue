<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, toRaw, watch, watchEffect } from 'vue'
import axios from 'axios'
import { createNewCollection, deleteCollectionFromServer, importCollectionFromExternalSource, pollServerForImportStatus, retrieveCollections, viewCardsInCollection } from '@/api/collection';

const base_api_url = import.meta.env.VITE_LARAVEL_API_BASE_URL;

const csvFile = ref(null)
const listOfCollections = ref([])
const selectedCollection = ref(1)
const selectedMode = ref('merge')
const importSummary = ref(null)
const isImporting = ref(false)
const toastMessage = ref('')
const toastColor = ref('success')
const cardsInCollection = ref([])
const currentPage = ref(1)
const hasMore = ref(true)
const isLoading = ref(false)
const shouldExcludeMultiColor = ref(false)

const searchTerm = ref('')
const sortKey = ref('name')
const sortDirection = ref('asc')
const activeColors = ref<string[]>([])
const groupByName = ref(false)

// for collection deletion
const deleteDialog = ref(false)
const deleteSnackbar = ref(false)
const collectionToDelete = ref(null)

function onColorFilterChange(newColors: string[]) {
  activeColors.value = newColors
  refreshFilteredCards()
}

function excludeMultiColor() {
    shouldExcludeMultiColor.value = !shouldExcludeMultiColor.value
    refreshFilteredCards()
}

const globalColorCounts = ref<Record<string, number>>({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 })

const tab = ref('Create Collection')
const tabLabels = ['Create Collection', 'Add to Collections', 'View Collections'];

const newCollectionFields = reactive({
    name: '',
    description: ''
})

const scrollAnchor = ref(null)

const modeOptions = [
    { title: 'Merge with Existing', value: 'merge', subtitle: 'Add to existing card counts' },
    { title: 'Set Count', value: 'set', subtitle: 'Override existing card counts' },
    { title: 'Create New', value: 'new', subtitle: 'Create new entries only' }
]

const submitImport = async () => {
    if (!csvFile.value || !selectedCollection.value) return
    
    isImporting.value = true
    const formData = new FormData()
    formData.append('csv', csvFile.value)
    formData.append('collection_id', selectedCollection.value)
    formData.append('mode', selectedMode.value)

    const response = await importCollectionFromExternalSource(formData)
    //importSummary.value = response.data.summary || 'Import completed successfully.'
    pollImportStatus(selectedCollection.value)
}

const pollImportStatus = async (collectionId) => {
  const interval = setInterval(async () => {
    const { data } = await pollServerForImportStatus(collectionId)
    if (data.status === 'complete') {
      clearInterval(interval)
      toastMessage.value = 'Import complete!'
      isImporting.value = false
      //await fetchCollectionCards(collectionId)
    } else if (data.status === 'failed') {
      clearInterval(interval)
      toastMessage.value = 'Import failed. Check logs for details.'
    }
  }, 3000)
}

const createCollection = async () => {
    if (!newCollectionFields.name.trim()) return
    
    try {
        const response = await createNewCollection({
            name: newCollectionFields.name,
            description: newCollectionFields.description
        })
        
        // Reset form
        newCollectionFields.name = ''
        newCollectionFields.description = ''
        
        // Refresh collections list
        await fetchCollections()
        
        console.log('Collection created:', response.data)
    } catch (error) {
        console.error('Error creating collection:', error)
    }
}

const viewCollection = async (collectionId) => {
    selectedCollection.value = collectionId
    cardsInCollection.value = []
    currentPage.value = 1
    hasMore.value = true
    try {
        const response = await viewCardsInCollection(collectionId)

        const meta = response.data.meta
        hasMore.value = meta.current_page < meta.last_page

        if (meta.is_complete) {
            hasMore.value = false
        }

        // Handle paginated response - extract the data array
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
            cardsInCollection.value = response.data.data
        } else if (Array.isArray(response.data)) {
            // Fallback if it's already an array
            cardsInCollection.value = response.data
        } else {
            console.error('Unexpected response structure:', response.data)
            cardsInCollection.value = []
        }
        
        console.log('Cards loaded:', cardsInCollection.value.length)
        computeGlobalColorCounts(cardsInCollection.value)
        tab.value = 'View Collections'
    } catch (error) {
        console.error('Error fetching collection cards:', error)
    }
}

const fetchCollections = async () => {
    try {
        const response = await retrieveCollections()
        listOfCollections.value = response.data
    } catch (error) {
        console.error('Error fetching collections:', error)
    }
}

onMounted(() => {
    fetchCollections()

    watchEffect(() => {
        if (cardsInCollection.value.length > 0 && scrollAnchor.value) {
            nextTick(() => {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore.value && !isLoading.value) {
                console.log('Scroll anchor intersected')
                loadMoreCards()
                }
            }, {
                root: null, // use viewport
                threshold: 0.5
            })

            observer.observe(scrollAnchor.value)
            })
        }}
    )
})

const filteredAndSortedCards = computed(() => {
  let cards = cardsInCollection.value || []

  // 🔍 Search filter
  if (searchTerm.value) {
    cards = cards.filter(card => {
      const name = card.card_from_set?.name || ''
      return name.toLowerCase().includes(searchTerm.value.toLowerCase())
    })
  }

  // 🎨 Color filter
  if (activeColors.value.length > 0) {
    cards = cards.filter(card => {
        const raw = card.card_from_set?.colorIdentities || ''
        const codes = typeof raw === 'string'
        ? raw.split(',').map(c => c.trim())
        : Array.isArray(raw)
            ? raw
            : []

        const isSubset = codes.every(code => activeColors.value.includes(code))

        return isSubset
    })

    console.log('Color identities:', cards.map(c => c.card_from_set?.colorIdentities))
  }

  // 🔀 Sorting
  return cards.sort((a, b) => {
    if (sortKey.value === 'name') {
      const nameA = a.card_from_set?.name || ''
      const nameB = b.card_from_set?.name || ''
      return nameA.localeCompare(nameB)
    }
    if (sortKey.value === 'count') return b.card_count - a.card_count
    if (sortKey.value === 'condition') {
      const condA = a.condition || ''
      const condB = b.condition || ''
      return condA.localeCompare(condB)
    }
    return 0
  })
})

const groupedCards = computed(() => {
  if (!groupByName.value) return filteredAndSortedCards.value

  const map = new Map<string, any>()

  for (const card of filteredAndSortedCards.value) {
    const name = card.card_from_set?.name || 'Unknown'

    if (!map.has(name)) {
      map.set(name, {
        ...card,
        card_count: card.card_count,
        variants: [card]
      })
    } else {
      const existing = map.get(name)
      existing.card_count += card.card_count
      existing.variants.push(card)
    }
  }

  return Array.from(map.values())
})

const queryParams = computed(() => ({
    sort: {
        key: sortKey.value,
        direction: sortDirection.value
    },
    filters: {
        colors: activeColors.value,
        excludeMultiColor: shouldExcludeMultiColor.value,
        search: searchTerm.value,
        //sets: activeSets.value,
        //rarities: activeRarities.value
    },
    page: currentPage.value
}))

watch(queryParams, async () => {
    await refreshFilteredCards()
    //cardsInCollection.value = response.
})

async function refreshFilteredCards() {
  const response = await viewCardsInCollection(selectedCollection.value, queryParams.value)
  cardsInCollection.value = response.data.data
  //currentPage.value = 2
  hasMore.value = response.data.meta.current_page < response.data.meta.last_page
}


const loadMoreCards = async () => {
  if (!hasMore.value || isLoading.value) return

  isLoading.value = true
  try {
    currentPage.value++
    const response = await viewCardsInCollection(selectedCollection.value, {
        params: queryParams.value
    })
    const newCards = response.data.data || []

    const cardMap = new Map(cardsInCollection.value.map(card => [card.id, card]))
    newCards.forEach(card => cardMap.set(card.id, card))
    cardsInCollection.value = Array.from(cardMap.values())
    //cardsInCollection.value.push(...newCards)

    const meta = response.data.meta
    hasMore.value = meta.current_page < meta.last_page
  } catch (error) {
    console.error('Error loading cards:', error)
  } finally {
    isLoading.value = false
  }
}

function computeGlobalColorCounts(cards: any[]) {
  const counts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }

  for (const card of cards) {
    const raw = card.card_from_set?.colorIdentities || ''
    const codes = typeof raw === 'string'
      ? raw.split(',').map(c => c.trim())
      : Array.isArray(raw)
        ? raw
        : []

    if (codes.length === 0) {
      counts['C']++
    } else {
      for (const code of codes) {
        if (counts[code] !== undefined) {
          counts[code]++
        }
      }
    }
  }

  globalColorCounts.value = counts
}

function confirmDelete(collection) {
    collectionToDelete.value = collection;
    deleteDialog.value = true;
}

async function deleteCollection() {
  try {
    await deleteCollectionFromServer(collectionToDelete.value.id);
    listOfCollections.value = listOfCollections.value.filter(
      c => c.id !== collectionToDelete.value.id
    );
    deleteSnackbar.value = true;
  } catch (error) {
    console.error('Failed to delete collection:', error);
    // Optional: use a toast library or fallback UI
  } finally {
    deleteDialog.value = false;
    collectionToDelete.value = null;
  }
}
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
                    <div class="form-header mb-6">
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
                        item-title="name"
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
                            <v-list-item-title>{{ item.raw.collection_name }}</v-list-item-title>
                            <v-list-item-subtitle v-if="item.raw.description">
                                {{ item.raw.description }}
                            </v-list-item-subtitle>
                            </v-list-item>
                        </template>

                        <!-- selected label -->
                        <template v-slot:selection="{ item }">
                            <span v-if="item && item.raw">{{ item.raw.collection_name }}</span>
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
                                    <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
                                    <v-list-item-subtitle>{{ item.raw.subtitle }}</v-list-item-subtitle>
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
            <v-card class="collections-view-card">
                <v-card-text class="pa-8">
                    <div class="form-header mb-6">
                        <h2 class="text-h5 font-weight-bold text-primary mb-2">
                            <v-icon icon="mdi-view-list" class="mr-2"></v-icon>
                            Your Collections
                        </h2>
                        <p class="text-body-1 text-medium-emphasis">
                            Browse and manage your Magic card collections
                        </p>
                    </div>

                    <!-- Collection List (only show if no cards are being viewed) -->
                    <div v-if="cardsInCollection.length === 0">
                        <v-row v-if="listOfCollections.length > 0">
                            <v-col 
                                v-for="collection in listOfCollections" 
                                :key="collection.id"
                                cols="12" 
                                md="6" 
                                lg="4"
                            >
                                <v-card class="collection-item-card" variant="outlined">
                                    <v-card-text class="pa-4">
                                        <h3 class="text-h6 font-weight-bold mb-2">
                                            {{ collection.collection_name }}
                                        </h3>
                                        <span>
                                            <p v-if="collection.description" class="text-body-2 text-medium-emphasis">
                                                {{ collection.description }}
                                            </p>
                                            <p v-else class="text-body-2 text-disabled">
                                                    No description provided
                                                </p>
                                            <p v-if="collection.total_cards" class="text-body-2 text-medium-emphasis">
                                                Unique:{{ collection.total_unique_cards }}
                                            </p>
                                            <p v-if="collection.total_cards" class="text-body-2 text-medium-emphasis">
                                                Total:{{ collection.total_cards }}
                                            </p>                                            
                                        </span>                                        
                                    </v-card-text>
                                    <v-card-actions class="pa-4 pt-0">
                                        <v-btn 
                                            variant="outlined" 
                                            size="small"
                                            prepend-icon="mdi-eye"
                                            @click="viewCollection(collection.id)"
                                        >
                                            View Cards
                                        </v-btn>
                                        <v-spacer></v-spacer>
                                    </v-card-actions>
                                    <v-menu location="bottom end">
                                    <template v-slot:activator="{ props }">
                                        <v-btn v-bind="props" variant="text" size="small" icon="mdi-dots-vertical"></v-btn>
                                    </template>
                                    <v-list density="compact">
                                        <v-list-item @click="confirmDelete(collection)">
                                        <v-list-item-title>Delete</v-list-item-title>
                                        </v-list-item>
                                    </v-list>
                                    </v-menu>                                    
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
                            <v-snackbar v-model="deleteSnackbar" color="success" timeout="3000">
                            Collection deleted successfully.
                            </v-snackbar>                                                      
                        </v-row>
                        <v-empty-state
                            v-else
                            icon="mdi-folder-plus"
                            title="No Collections Yet"
                            text="Create your first collection to start organizing your Magic cards"
                        >
                            <template v-slot:actions>
                                <v-btn
                                    @click="tab = 'Create Collection'"
                                    color="primary"
                                    variant="elevated"
                                    prepend-icon="mdi-plus"
                                >
                                    Create Collection
                                </v-btn>
                            </template>
                        </v-empty-state>
                    </div>

                    <!-- Card Display Section (show when cards are loaded) -->
                    <div v-if="cardsInCollection.length > 0" class="cards-section">
                        <!-- Back Button -->
                        <v-btn 
                            @click="cardsInCollection = []"
                            variant="outlined"
                            prepend-icon="mdi-arrow-left"
                            class="mb-4"
                        >
                            Back to Collections
                        </v-btn>

                        <!-- Search and Sort Controls -->
                        <v-card class="mb-4" variant="outlined">
                            <v-card-text class="pa-4">
                                <v-row>
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
                                    <v-col cols="10" md="4">
                                        <v-select
                                            v-model="sortKey"
                                            :items="[
                                                { title: 'Name', value: 'name' },
                                                { title: 'Count', value: 'count' },
                                                { title: 'Condition', value: 'condition' }
                                            ]"
                                            label="Sort by"
                                            variant="outlined"
                                            density="comfortable"
                                        ></v-select>
                                    </v-col>
                                    <v-col cols="2" md="4">
                                        <v-btn v-model="sortDirection" @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'" variant="outlined" class="mt-4">
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
                            <v-col between>
                                <v-row>
                                    <v-col class="pa-2 ma-2">
                                        <v-checkbox @click="excludeMultiColor">Exclude Multicolor</v-checkbox>
                                    </v-col>
                                    <v-col class="pa-2 ma-2">
                                        <v-switch v-model="groupByName" label="Group by Card Name" color="primary" class="mt-4" />
                                    </v-col>
                                </v-row>
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
                            </v-card-text>
                        </v-card>

                        <!-- Cards Grid -->
                        <div class="card-grid">
                            <v-card v-for="card in groupedCards" 
                                :key="card.id" class="card-item" variant="outlined">
                                <v-img 
                                    :src="card.card_from_set?.image_url || 'https://via.placeholder.com/200x280'" 
                                    :alt="card.card_from_set?.name || 'Card'"
                                    aspect-ratio="5/7"
                                ></v-img>
                                <v-card-text class="pa-2">
                                    <p class="text-body-2 font-weight-bold">
                                        {{ card.card_from_set?.name || 'Unknown Card' }} 
                                        <v-chip size="x-small" color="primary">{{ card.card_count }}</v-chip>
                                    </p>
                                    <p class="text-caption text-medium-emphasis">
                                        {{ card.card_from_set?.set_name || 'Unknown Set' }}
                                    </p>
                                    <p v-if="card.is_foil" class="text-caption text-warning">
                                        ✨ Foil
                                    </p>
                                </v-card-text>
                            </v-card>
                        </div>
                        <div ref="scrollAnchor" style="height: 20px; background: red;"></div>
                        <!-- No Results -->
                        <v-empty-state
                            v-if="filteredAndSortedCards.length === 0"
                            icon="mdi-magnify"
                            title="No Cards Found"
                            text="Try adjusting your search terms"
                        ></v-empty-state>
                    </div>
                </v-card-text>
            </v-card>
        </v-window-item>
    </v-window>
</template>

<style scoped>
/* Header Styles */
.collections-header-card {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.collections-tabs .tab-item {
    text-transform: none;
    font-weight: 500;
    letter-spacing: 0.25px;
}

/* Form Card Styles */
.collection-form-card,
.import-form-card,
.collections-view-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

/* Form Header */
.form-header {
    text-align: center;
    padding: 16px;
    background: linear-gradient(90deg, rgba(33, 150, 243, 0.05), rgba(76, 175, 80, 0.05));
    border-radius: 12px;
    margin: -16px -16px 24px -16px;
}

/* Form Styles */
.collection-form,
.import-form {
    max-width: 600px;
    margin: 0 auto;
}

/* Button Styles */
.create-btn,
.import-btn {
    border-radius: 12px;
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 16px rgba(33, 150, 243, 0.3);
    transition: all 0.3s ease;
    min-width: 160px;
}

.create-btn:hover,
.import-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
}

.create-btn:disabled,
.import-btn:disabled {
    opacity: 0.6;
    transform: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Form Actions */
.form-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-top: 24px;
}

/* Import Results */
.import-results {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 12px;
}

.import-summary-text {
    font-family: 'Roboto Mono', monospace;
    font-size: 14px;
    line-height: 1.4;
    color: #2e7d32;
    background: rgba(76, 175, 80, 0.1);
    padding: 16px;
    border-radius: 8px;
    white-space: pre-wrap;
    overflow-x: auto;
}

/* Collection Item Cards */
.collection-item-card {
    transition: all 0.3s ease;
    height: 100%;
}

.collection-item-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .form-header {
        margin: -8px -8px 16px -8px;
        padding: 12px;
    }
    
    .collection-form,
    .import-form {
        max-width: none;
    }
    
    .form-actions {
        flex-direction: column;
        align-items: stretch;
    }
    
    .create-btn,
    .import-btn {
        width: 100%;
    }
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.card img {
  width: 100%;
  height: auto;
}
.card-item {
  flex: 1 1 auto;
  min-width: 200px;
  max-width: 300px;
}
</style>