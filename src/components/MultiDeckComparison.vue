<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import draggable from 'vuedraggable'
import { useDeckData } from '@/composables/useDeckData'
import { buildComparisonMatrix, buildShoppingList } from '@/utils/deckComparisonUtils'
import type { Deck, MatrixRow } from '@/utils/types'
import { useCsvExport, type CsvColumn } from '../composables/useCsvExport'

// 1️⃣ Grab selected decks and their cards
const {
  cardsInSelectedDeck,
  getCardsForDeckByIndex,
  listOfStoredDecks,
  //moveDeckImmutable,
  resetCardsForSelectedDecks,
  //selectedDecks
} = useDeckData()

const deckData = useDeckData()
const selectedDecks = deckData.selectedDecks
const moveDeckImmutable = deckData.moveDeckImmutable

// 2️⃣ Define type groups and selection
const typeHierarchy = [
  'Creature',
  'Artifact',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Land'
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

// 8️⃣ Fetch cards when decks change
// COMBINE: combobox selection → explicit handler
async function handleSelectionChange(newSelection: Deck[]) {
  // 1️⃣ update selection
  selectedDecks.value = newSelection

  // 2️⃣ reset all card‐lists
  resetCardsForSelectedDecks(newSelection)

  // 3️⃣ fetch each deck’s cards
  //    await if you need them in order
  await nextTick()
  newSelection.forEach((deck, i) => {
    if (!cardsInSelectedDeck.value[i]?.length) {
      getCardsForDeckByIndex(deck.deck_id, i)
    }
  })
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
    const count = card.deckCounts[`deck_${deck.deck_id}`]
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

function exportToCSV() {

  if (lockedDeckIndexes.value.length === 0) {
    return alert('No data to export')
  }

  const lockedDecks = lockedDeckIndexes.value.map(i => decks.value[i])
  const shoppingListForExport = buildShoppingList(lockedDecks)

  // Define columns for CSV export
  const columns: CsvColumn<any>[] = [
    { key: 'name', label: 'Name' },
    { key: 'official_set_name', label: 'Set' },
    { key: 'rarity', label: 'Rarity' },
    { key: 'mana_cost', label: 'Mana Cost' },
    { key: 'type_line', label: 'Type' },
    { key: 'oracle_text', label: 'Text' }
  ]
  
  downloadCsv(matrix.value, columns, 'mtg_cards_export.csv')
}
</script>

<template>
  <div class="deck-comparison-container">
    <!-- 1) Combobox uses @update:model-value instead of v-model -->
    <v-combobox
      :items="listOfStoredDecks"
      :model-value="selectedDecks"
      @update:modelValue="handleSelectionChange"
      item-title="deck_name"
      item-value="deck_id"
      return-object
      multiple
      chips
      label="Compare Decks"
      class="mb-4"
    />

    <!-- Type Filter Chips -->
    <div class="type-filter">
      <v-switch
        v-for="type in typeHierarchy"
        :key="type"
        filter
        :input-value="selectedTypes.includes(type)"
        :label="type"
        @click="toggleType(type)"
        class="ma-1"
      />
    </div>

<div class="comparison-row header-row">
  <div class="card-row header-card-row">
    <div class="card-name-left">Card</div>
    <div class="card-mana-right">Mana</div>
  </div>

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
      class="card-cell deck-header-cell"
      :style="{ width: deckWidths[index] + 'px' }">
      <span>{{ element.deck_name }}</span>
      <v-icon
        size="18"
        class="ml-1 lock-icon"
        :color="element.locked ? 'green' : 'grey'"
        @click.stop="toggleDeckLock(index)">
        {{ element.locked ? 'mdi-lock' : 'mdi-lock-open' }}
      </v-icon>

      <!-- Resize handle: excluded from drag -->
      <div class="resize-handle" @mousedown.stop.prevent="startResize(index, $event)"></div>
    </div>
  </template>
</draggable>



      <div class="card-cell card-total">Total</div>
    </div>

    <!-- Grouped Rows by Type -->
    <template v-for="type in typeHierarchy" :key="type">
      <div class="type-banner">{{ type }}</div>

      <div
        v-for="card in groupedItems[type]"
        :key="card.name"
        class="comparison-row"
      >
        <CardRow :card="card" :count="Object.values(card.deckCounts).reduce((sum: number, c: number) => sum + c, 0)" />

        <div class="deck-columns">
          <div
            v-for="(deck, index) in selectedDecks"
            :key="deck.deck_id"
            class="card-cell card-count" 
            :style="{ width: deckWidths[index] + 'px' }">
            {{ card.deckCounts[`deck_${deck.deck_id}`] ?? '-' }}
          </div>
        </div>

        <div class="card-cell card-total">
          {{ getLockedTotal(card) }}
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.deck-comparison-container {
  padding: 16px;
  overflow-x: auto;
  font-size: 14px;
}

/* Type filter chips */
.type-filter {
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Main comparison table container */
.comparison-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: fit-content;
  overflow-x: auto;
  background-color: #fdfdfd;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding-bottom: 12px;
  overflow-x: auto;
}

/* Type section headers */
.type-banner {
  background-color: #dbe4ff;
  font-weight: bold;
  text-transform: uppercase;
  padding: 8px 12px;
  border-top: 1px solid #b0c4ff;
  border-bottom: 1px solid #b0c4ff;
  color: #1a237e;
  letter-spacing: 0.5px;
}

/* Shared row layout */
.comparison-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding: 4px 8px;
  min-width: fit-content; // ✅ prevent flex shrink
}

/* Header row */
.header-row {
  font-weight: bold;
  background-color: #f0f4ff;
  border-bottom: 2px solid #b0c4ff;
  position: sticky;
  top: 0;
  z-index: 1;
}

/* Shared cell styles */
.card-cell {
  flex-shrink: 0;
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* CardRow container */
.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 320px;
  max-width: 400px;
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.header-card-row {
  background-color: #f0f4ff;
  font-weight: bold;
  border-bottom: 2px solid #b0c4ff;
}

.card-name-left {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-mana-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  justify-content: flex-end;
}

/* Deck count columns */
.card-count {
  width: 80px;
  text-align: center;
  font-weight: bold;
}

/* Locked total column */
.card-total {
  width: 80px;
  text-align: center;
  font-weight: bold;
  color: #1b5e20;
  border-left: 1px solid #ccc;
}

/* Draggable deck columns */
.deck-columns {
  display: flex;
  flex-direction: row;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  min-width: fit-content; // ✅ allow horizontal growth
}


/* Color symbol alignment */
.color-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Optional: highlight common/partial cards */
.common {
  font-weight: bold;
  color: #1b5e20;
}

.partial {
  color: #f57c00;
}

.deck-header-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  padding-right: 6px;
}

.deck-header-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  padding-right: 6px;
  cursor: grab; // ✅ entire cell is draggable
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  background-color: rgba(0, 0, 0, 0.1);
  border-left: 1px solid #ccc;
  z-index: 2;
}
</style>