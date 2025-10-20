<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import draggable from 'vuedraggable'
import { useDeckData } from '@/composables/useDeckData'
import { buildComparisonMatrix, buildShoppingList } from '@/utils/deckComparisonUtils'
import type { Deck, MatrixRow, ShoppingListRow } from '@/utils/types'
import { useCsvExport, type CsvColumn } from '../composables/useCsvExport'
import axios from 'axios'

const base_api_url = import.meta.env.VITE_LARAVEL_API_BASE_URL;

//console.log('Symbol Base URL:', import.meta.env.VITE_SYMBOL_BASE_URL)
//console.log('All env:', import.meta.env)


// 1️⃣ Grab selected decks and their cards
const {
  cardsInSelectedDeck,
  cardsInSideboardOfSelectedDeck,
  getDeckArchetypesInDB,
  getCardsForDeckByIndex,
  listOfStoredDecks,
  resetCardsForSelectedDecks,
} = useDeckData()

const deckData = useDeckData()
const selectedDecks = deckData.selectedDecks
const moveDeckImmutable = deckData.moveDeckImmutable
const uniqueCardsInComparison = ref<string[]>([])
const listOfArchetypes = ref<string[]>([])
const selectedArchetype = ref('')

const listOfCollections = ref([])
const collectionsForInventory = ref<number[]>([15]) // Default collection ID
const normalizedInventory = ref<Record<string, any>>({}) // Inventory data

// 2️⃣ Define type groups and selection
const typeHierarchy = [
  'Creature',
  'Artifact', 
  'Instant',
  'Sorcery',
  'Enchantment',
  'Land',
  'Sideboard'
]
const selectedTypes = ref<string[]>([...typeHierarchy])
const deckWidths = ref<number[]>([])

function toggleType(type: string) {
  const i = selectedTypes.value.indexOf(type)
  if (i >= 0) selectedTypes.value.splice(i, 1)
  else selectedTypes.value.push(type)
}

// 3️⃣ Shape to Deck[]
const decks = computed<Deck[]>(() =>
  selectedDecks.value.map((d, i) => ({
    deck_id: d.deck_id,
    deck_name: d.deck_name,
    cards: cardsInSelectedDeck.value[i] || [],
    sideboard_cards: cardsInSideboardOfSelectedDeck.value[i] || [],
    locked: d.locked,
    archetype: d.archetype ?? null
  }))
)

// 4️⃣ Build the comparison matrix
const matrix = computed(() => buildComparisonMatrix(decks.value))

const filteredMatrix = computed(() =>
  matrix.value.filter(row => {
    const typeString = row.type || ''
    return selectedTypes.value.some(type => typeString.includes(type))
  })
)

// 6️⃣ Group rows by type
const groupedItems = computed(() => {
  const groups: Record<string, MatrixRow[]> = {}
  // Initialize empty arrays for each type
  typeHierarchy.forEach(type => {
    groups[type] = []
  })

  // Group matrix rows by first matching type in hierarchy
  filteredMatrix.value.forEach((row: MatrixRow) => {
    const typeString = row.type || ''

    let matchedType: string | undefined = undefined
    if (typeString.includes('Land')) {
      matchedType = 'Land'
    } else {
      matchedType = typeHierarchy.find(type => typeString.includes(type))
    }

    if (matchedType) {
      groups[matchedType].push(row)
    }
  })
  return groups
})

const decksFilteredByArchetype = computed(() => {
  const selected = selectedArchetype.value?.toLowerCase().trim()
  if (!selected || selected === 'all') {
    return listOfStoredDecks.value
  }
  return listOfStoredDecks.value.filter(deck =>
    deck.archetype?.toLowerCase().trim() === selected
  )
})

// Fetch cards when decks change
async function handleSelectionChange(newSelection: Deck[]) {
  // 1️⃣ update selection
  selectedDecks.value = newSelection

  // 2️⃣ reset all card‐lists
  resetCardsForSelectedDecks(newSelection)

  // 3️⃣ fetch each deck's cards and WAIT for them
  await nextTick()

 // Create promises for all deck card fetches
  const cardFetchPromises = newSelection.map((deck, i) => {
    if (!cardsInSelectedDeck.value[i]?.length) {
      return getCardsForDeckByIndex(deck.deck_id, i)
    }
    return Promise.resolve() // If cards already loaded
  })

  // 🔥 WAIT for ALL cards to be loaded
  await Promise.all(cardFetchPromises)
  
  // 🔥 Add another nextTick to ensure reactive updates are complete
  await nextTick()
  const allDeckCards = decks.value.flatMap(deck => deck.cards)
  const uniqueNames = Array.from(new Set(allDeckCards.map(card => card.name.trim())))

  console.log(JSON.stringify(uniqueNames));
  //uniqueCardsInComparison.value = uniqueNames

  const response = await axios.post(`${base_api_url}/inventory/lookup-normalized`, {
    card_names: uniqueNames,
    collection_ids: collectionsForInventory.value
  })

  normalizedInventory.value = Object.fromEntries(
  response.data.map((entry: { name: any }) => [entry.name, entry])
)

console.log('🔍 Raw API response:', response.data)

// Handle both array and object responses
let inventoryEntries
if (Array.isArray(response.data)) {
  // If it's an array (as the backend should return)
  inventoryEntries = response.data
} else {
  // If it's an object with numeric keys (what you're seeing)
  inventoryEntries = Object.values(response.data)
}

normalizedInventory.value = Object.fromEntries(
  inventoryEntries.map((entry: any) => [entry.name, entry])
)

console.log('📦 Processed inventory:', normalizedInventory.value)
}

function getInventoryCount(card: any): number {
  const name = card.name.trim()
  const inventory = normalizedInventory.value[name]
  
  if (!inventory) {
    // Try fuzzy matching for debugging
    const availableNames = Object.keys(normalizedInventory.value)
    const similarNames = availableNames.filter(n => 
      n.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(n.toLowerCase())
    )
    
/*     if (similarNames.length > 0) {
      console.warn(`🔍 "${name}" not found, but similar: ${similarNames.join(', ')}`)
    } else {
      console.warn(`❌ "${name}" not found in inventory at all`)
    } */
  }
  
  return inventory?.total_count || 0
}
function getDelta(card: any): number {
  const lockedTotal = getLockedTotal(card)
  const inventory = getInventoryCount(card)
  return Math.max(lockedTotal - inventory, 0)
}

// DRAG: reorder decks + their card groups
async function onDeckReorder(evt: { oldIndex: number; newIndex: number }) {
  moveDeckImmutable(evt.oldIndex, evt.newIndex)
  
  await nextTick()
  const movedWidth = deckWidths.value.splice(evt.oldIndex, 1)[0]
  deckWidths.value.splice(evt.newIndex, 0, movedWidth)
}

const lockedDeckIndexes = computed(() =>
  selectedDecks.value
    .map((deck: Deck, i: number) => deck.locked ? i : null)
    .filter(i => i !== null)
)

function getLockedTotal(card: MatrixRow): number {
  return lockedDeckIndexes.value.reduce((sum: number, i: number) => {
    const deck = decks.value[i]
    const count = card.deckCounts[`deck_${deck.deck_id}_main`] || card.deckCounts[`deck_${deck.deck_id}_side`]
    return typeof count === 'number' ? sum + count : sum
  }, 0)
}

function toggleDeckLock(index: number) {
  const deck = selectedDecks.value[index]
  deck.locked = !deck.locked
}

watch(selectedDecks, (newDecks) => {
  deckWidths.value = newDecks.map(() => 120) // default width per deck
}, { immediate: true })

function startResize(index: number, e: MouseEvent) {
  const startX = e.clientX
  const startWidth = deckWidths.value[index]

  function onMouseMove(ev: MouseEvent) {
    const delta = ev.clientX - startX
    deckWidths.value[index] = Math.max(60, startWidth + delta)
  }

  function onMouseUp() {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// CSV Export composable
const { downloadCsv } = useCsvExport<any>()

async function exportToCSV() {
  if (lockedDeckIndexes.value.length === 0) {
    return alert('No data to export');
  }

  const lockedDecks = lockedDeckIndexes.value.map(i => decks.value[i]);
  const shoppingListForExport = await buildShoppingList(lockedDecks);

  if (shoppingListForExport.length === 0) {
    return alert('No cards found in locked decks.');
  }

  const rows: ShoppingListRow[] = shoppingListForExport.map(card => {
    const inventoryEntry = normalizedInventory.value[card.name];
    const inventoryCount = inventoryEntry?.total_count ?? 0;
    const need = Math.max(card.total - inventoryCount, 0);

    const priceVariants = card.prices?.slice(0, 3) ?? [];
    const indexOfLowestPrice = priceVariants.reduce((minIndex, p, i, arr) => 
      (p.price < arr[minIndex].price ? i : minIndex), 0);

    return {
      name: card.name,
      total_locked: card.total,
      inventory: inventoryCount,
      need,
      mana_cost: card.mana_cost || '',
      type: card.type || '',
      official_set_name: card.official_set_name || '',
      price_1: priceVariants[0]?.price ?? '',
      set_1: priceVariants[0]?.set_name ?? '',
      price_2: priceVariants[1]?.price ?? '',
      set_2: priceVariants[1]?.set_name ?? '',
      price_3: priceVariants[2]?.price ?? '',
      set_3: priceVariants[2]?.set_name ?? '',
      tcg_player_link: priceVariants[indexOfLowestPrice]?.tcg_player_link || ''
    };
  });

  const columns: CsvColumn<ShoppingListRow>[] = [
    { key: 'name',             label: 'Name' },
    { key: 'total_locked',     label: 'Locked Total' },
    { key: 'inventory',        label: 'Inventory' },
    { key: 'need',             label: 'Need' },
    { key: 'mana_cost',        label: 'Mana Cost' },
    { key: 'type',             label: 'Type' },
    { key: 'official_set_name',label: 'Set' },
    { key: 'price_1',          label: 'Price 1' },
    { key: 'set_1',            label: 'Set 1' },
    { key: 'price_2',          label: 'Price 2' },
    { key: 'set_2',            label: 'Set 2' },
    { key: 'price_3',          label: 'Price 3' },
    { key: 'set_3',            label: 'Set 3' },
    { key: 'tcg_player_link',  label: 'TCGPlayer Link' }
  ];

  downloadCsv(rows, columns, 'shopping_list.csv');
}


// Helper function to get type-specific icons
function getTypeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'Creature': 'mdi-account-multiple',
    'Artifact': 'mdi-cog',
    'Instant': 'mdi-flash',
    'Sorcery': 'mdi-book-open-page-variant',
    'Enchantment': 'mdi-shimmer',
    'Land': 'mdi-terrain',
    'Sideboard': 'mdi-view-list'
  }
  return iconMap[type] || 'mdi-cards'
}

// Helper function to get count-based colors
function getCountColor(count: number): string {
  if (count >= 4) return 'success'
  if (count >= 2) return 'warning'
  return 'info'
}

const fetchArchetypes = async () => {
  try {
    const archetypes = await getDeckArchetypesInDB()
    listOfArchetypes.value = ['All', ...archetypes]
  } catch (error) {
    console.error('Error fetching archetypes:', error)
  }
}

const fetchCollections = async () => {
  try {
    const response = await axios.get(`${base_api_url}/collections`)
    listOfCollections.value = response.data.map(c => ({
      id: c.id,
      name: c.collection_name,
      description: c.description
    }))
  } catch (error) {
    console.error('Error fetching collections:', error)
  }
}

onMounted(() => {
  fetchArchetypes()
  fetchCollections()
})

watch(decksFilteredByArchetype, (val) => {
  console.log('Filtered decks:', val)
})
</script>

<template>
  <div class="deck-comparison-page">
    <!-- Header Section -->
    <div class="comparison-header">
      <v-card class="header-card">
        <v-card-text class="pa-6">
          <div class="header-content">
            <v-row justify="space-between">
              <v-col align-self="start">
                <h2 class="text-h4 font-weight-bold text-primary mb-4">
                  <v-icon icon="mdi-compare" class="mr-3"></v-icon>
                  Multi-Deck Comparison
                </h2>
              </v-col>
              <v-col align-self="end">
                <v-btn @click="exportToCSV" color="secondary" variant="outlined" size="large" prepend-icon="mdi-download">
                  Export CSV
                </v-btn>
              </v-col>              
            </v-row>            
            <!-- Deck Selection -->
             <v-combobox
               v-model="selectedArchetype"
               :items="listOfArchetypes"
               label="Filter by Archetype"
             />
            <v-combobox
              :items="decksFilteredByArchetype"
              :model-value="selectedDecks"
              @update:modelValue="handleSelectionChange"
              item-title="deck_name"
              item-value="deck_id"
              return-object
              multiple
              chips
              label="Select Decks to Compare"
              placeholder="Choose multiple decks for side-by-side comparison..."
              variant="outlined"
              density="comfortable"
              class="deck-selector mb-4"
              prepend-inner-icon="mdi-cards-outline"
              clearable
            >
              <template v-slot:chip="{ props, item }">
                <v-chip
                  v-bind="props"
                  :color="item.raw.locked ? 'success' : 'primary'"
                  variant="elevated"
                  closable
                >
                  <v-icon 
                    v-if="item.raw.locked" 
                    icon="mdi-lock" 
                    start 
                    size="16"
                  ></v-icon>
                  {{ item.raw.deck_name }}
                </v-chip>
              </template>
            </v-combobox>
            <v-select
              v-model="collectionsForInventory"
              :items="listOfCollections"
              item-title="name"
              item-value="id"
              label="Reference Collections"
              multiple
              chips
              clearable
              variant="outlined"
              return-object
            >
              <template v-slot:item="{ item, props }">
                <v-list-item v-bind="props">
                  <v-list-item-title>{{ item.name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-select>

            <!-- Type Filters -->
            <v-expansion-panels class="mb-4" variant="accordion">
              <v-expansion-panel>
                <v-expansion-panel-title class="text-h6">
                  <v-icon icon="mdi-filter-variant" class="mr-2"></v-icon>
                  Card Type Filters
                  <v-chip 
                    v-if="selectedTypes.length < typeHierarchy.length"
                    color="primary" 
                    size="small" 
                    class="ml-2"
                  >
                    {{ selectedTypes.length }}/{{ typeHierarchy.length }}
                  </v-chip>
                </v-expansion-panel-title>
                
                <v-expansion-panel-text>
                  <div class="type-filters">
                    <v-chip-group 
                      v-model="selectedTypes" 
                      multiple
                      @update:model-value="(newValue: string[]) => selectedTypes = newValue"
                    >
                      <v-chip
                        v-for="type in typeHierarchy"
                        :key="type"
                        :value="type"
                        :color="selectedTypes.includes(type) ? 'primary' : 'default'"
                        :variant="selectedTypes.includes(type) ? 'elevated' : 'outlined'"
                        filter
                      >
                        {{ type }}
                      </v-chip>
                    </v-chip-group>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <v-btn
                v-if="lockedDeckIndexes.length > 0"
                @click="exportToCSV"
                color="secondary"
                variant="elevated"
                size="large"
                prepend-icon="mdi-download"
              >
                Export Shopping List
              </v-btn>
              
              <v-chip
                v-if="selectedDecks.length > 0"
                color="info"
                variant="outlined"
                size="large"
              >
                {{ selectedDecks.length }} deck{{ selectedDecks.length !== 1 ? 's' : '' }} selected
              </v-chip>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Comparison Table -->
    <div class="comparison-content" v-if="selectedDecks.length > 0">
      <v-card class="comparison-card">
        <div class="comparison-table">
          <!-- Header Row -->
          <div class="comparison-row header-row">
            <div class="card-info-column">
              <div class="card-name-header">Card Name</div>
              <div class="card-mana-header">Mana Cost</div>
            </div>

            <!-- Draggable Deck Headers -->
            <draggable
              tag="div"
              class="deck-columns"
              :modelValue="selectedDecks"
              item-key="deck_id"
              @end="onDeckReorder"
              :animation="200"
            >
              <template #item="{ element, index }">
                <div
                  class="deck-header-cell"
                  :style="{ width: deckWidths[index] + 'px' }"
                >
                  <div class="deck-header-content">
                    <span class="deck-name">{{ element.deck_name }}</span>
                    <v-tooltip :text="element.locked ? 'Locked for shopping list' : 'Click to lock for shopping list'">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-bind="props"
                          :icon="element.locked ? 'mdi-lock' : 'mdi-lock-open'"
                          :color="element.locked ? 'success' : 'default'"
                          size="small"
                          variant="text"
                          @click.stop="toggleDeckLock(index)"
                        />
                      </template>
                    </v-tooltip>
                  </div>

                  <!-- Resize Handle -->
                  <div 
                    class="resize-handle" 
                    @mousedown.stop.prevent="startResize(index, $event)"
                  ></div>
                </div>
              </template>
            </draggable>
            <div class="inventory-column">
              <v-icon icon="mdi-package-variant" color="info" size="16" class="mr-1"></v-icon>
              Inventory
            </div>
            <div class="delta-column">
              <v-icon icon="mdi-delta" color="warning" size="16" class="mr-1"></v-icon>
              Need
            </div>
            <div class="total-column">
              <v-icon icon="mdi-lock" color="success" size="16" class="mr-1"></v-icon>
              Locked Total
            </div>
          </div>

          <!-- Card Rows Grouped by Type -->
          <template v-for="type in typeHierarchy" :key="type">
            <div 
              v-if="groupedItems[type].length > 0"
              class="type-section"
            >
              <!-- Type Banner -->
              <div class="type-banner">
                <v-icon :icon="getTypeIcon(type)" class="mr-2"></v-icon>
                {{ type }}
                <v-chip 
                  color="primary" 
                  size="small" 
                  variant="outlined"
                  class="ml-2"
                >
                  {{ groupedItems[type].length }}
                </v-chip>
              </div>

              <!-- Cards of this type -->
              <div
                v-for="card in groupedItems[type]"
                :key="card.name"
                class="comparison-row card-row"
              >
                <div class="card-info-column">
                  <CardRow 
                    :card="card" 
                    :count="Object.values(card.deckCounts).reduce((sum: number, c: number) => sum + c, 0)" 
                  />
                </div>

                <div class="deck-columns">
                  <div
                    v-for="(deck, index) in selectedDecks"
                    :key="deck.deck_id"
                    class="card-count-cell" 
                    :style="{ width: deckWidths[index] + 'px' }"
                  >
                    <v-chip
                      v-if="card.deckCounts[`deck_${deck.deck_id}_main`] && card.type !== 'Sideboard'"
                      :color="getCountColor(card.deckCounts[`deck_${deck.deck_id}_main`])"
                      size="small"
                      variant="elevated"
                    >
                      {{ card.deckCounts[`deck_${deck.deck_id}_main`] }}
                    </v-chip>
                    <v-chip
                      v-else-if="card.deckCounts[`deck_${deck.deck_id}_side`] && card.type === 'Sideboard'"
                      :color="getCountColor(card.deckCounts[`deck_${deck.deck_id}_side`])"
                      size="small"
                      variant="elevated"
                    >
                      {{ card.deckCounts[`deck_${deck.deck_id}_side`] }}
                    </v-chip>
                    <span v-else class="no-card">-</span>
                  </div>
                </div>
                <!-- Inventory Column -->
                <div class="inventory-column">
                  <v-chip
                    v-if="getInventoryCount(card) > 0"
                    color="info"
                    size="small"
                    variant="outlined"
                  >
                    {{ getInventoryCount(card) }}
                  </v-chip>
                  <span v-else class="no-inventory">-</span>
                </div>

                <!-- Delta Column -->
                <div class="delta-column">
                  <v-chip
                    v-if="getDelta(card) > 0"
                    color="error"
                    size="small"
                    variant="elevated"
                  >
                    {{ getDelta(card) }}
                  </v-chip>
                  <span v-else class="no-delta">✓</span>
                </div>
                <div class="total-column">
                  <v-chip
                    v-if="getLockedTotal(card) > 0"
                    color="success"
                    size="small"
                    variant="elevated"
                  >
                    {{ getLockedTotal(card) }}
                  </v-chip>
                  <span v-else class="no-total">-</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Empty State -->
          <div v-if="filteredMatrix.length === 0" class="empty-state">
            <v-icon icon="mdi-cards-outline" size="64" color="grey"></v-icon>
            <h3 class="text-h6 mt-4 mb-2">No cards to display</h3>
            <p class="text-body-2 text-grey">
              Try adjusting your type filters or selecting different decks.
            </p>
          </div>
        </div>
      </v-card>
    </div>

    <!-- Empty State for No Decks -->
    <div v-else class="no-decks-state">
      <v-card class="empty-card">
        <v-card-text class="text-center pa-8">
          <v-icon icon="mdi-compare" size="80" color="grey-lighten-1"></v-icon>
          <h3 class="text-h5 mt-4 mb-2">Ready to Compare Decks</h3>
          <p class="text-body-1 text-grey mb-4">
            Select multiple decks from the dropdown above to see a side-by-side comparison of their cards.
          </p>
          <v-list class="comparison-features">
            <v-list-item prepend-icon="mdi-drag">
              <v-list-item-title>Drag to reorder deck columns</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-lock">
              <v-list-item-title>Lock decks to build a shopping list</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-filter">
              <v-list-item-title>Filter by card type</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<style scoped>
/* Page Layout */
.deck-comparison-page {
  padding: 24px;
  max-width: 100%;
  overflow-x: auto;
}

/* Header Section */
.comparison-header {
  margin-bottom: 24px;
}

.header-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.deck-selector :deep(.v-field) {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.type-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* Comparison Table */
.comparison-content {
  margin-top: 24px;
}

.comparison-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.comparison-table {
  display: flex;
  flex-direction: column;
  min-width: fit-content;
  overflow-x: auto;
}

.comparison-row {
  display: flex;
  align-items: center;
  min-height: 48px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 8px 16px;
}

/* Header Row */
.header-row {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%);
  font-weight: 600;
  border-bottom: 2px solid rgba(33, 150, 243, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Column Layouts */
.card-info-column {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 320px;
  max-width: 400px;
  padding: 0 16px;
  flex-shrink: 0;
}

.card-name-header,
.card-mana-header {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}

.deck-columns {
  display: flex;
  flex-direction: row;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  min-width: fit-content;
}

.deck-header-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: grab;
  transition: all 0.2s ease;
}

.deck-header-cell:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.deck-header-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  width: 100%;
  justify-content: space-between;
}

.deck-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.card-count-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  flex-shrink: 0;
}

.total-column {
  width: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-left: 2px solid rgba(76, 175, 80, 0.2);
  background: rgba(76, 175, 80, 0.05);
  border-radius: 0 8px 8px 0;
  flex-shrink: 0;
}

/* Type Sections */
.type-section {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.type-banner {
  background: linear-gradient(135deg, rgba(103, 58, 183, 0.1) 0%, rgba(103, 58, 183, 0.05) 100%);
  color: rgba(103, 58, 183, 1);
  font-weight: 600;
  text-transform: uppercase;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(103, 58, 183, 0.2);
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 48px;
  z-index: 9;
}

.card-row {
  transition: background-color 0.2s ease;
}

.card-row:hover {
  background: rgba(0, 0, 0, 0.02);
}

/* Resize Handle */
.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.1));
  border-radius: 0 8px 8px 0;
  z-index: 2;
}

.resize-handle:hover {
  background: linear-gradient(to right, transparent, rgba(33, 150, 243, 0.3));
}

/* Card Count Styling */
.no-card,
.no-total {
  color: rgba(0, 0, 0, 0.38);
  font-style: italic;
}

/* Empty States */
.empty-state,
.no-decks-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 500px;
  margin: 0 auto;
}

.comparison-features {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  max-width: 350px;
}

.inventory-column,
.delta-column {
  width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  padding: 0 8px;
  text-align: center;
}

.inventory-column {
  border-left: 2px solid rgba(33, 150, 243, 0.2);
  background: rgba(33, 150, 243, 0.05);
}

.delta-column {
  border-left: 2px solid rgba(255, 152, 0, 0.2);
  background: rgba(255, 152, 0, 0.05);
}

.no-inventory,
.no-delta {
  color: rgba(0, 0, 0, 0.38);
  font-style: italic;
}

/* Responsive Design */
@media (max-width: 768px) {
  .deck-comparison-page {
    padding: 16px;
  }
  
  .header-card .v-card-text {
    padding: 16px !important;
  }
  
  .card-info-column {
    min-width: 250px;
    max-width: 300px;
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-buttons .v-btn {
    width: 100%;
  }
}
</style>