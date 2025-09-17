<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import draggable from 'vuedraggable'
import { useDeckData } from '@/composables/useDeckData'
import { buildComparisonMatrix } from '@/utils/deckComparisonUtils'
//import CardRow from './CardRow.vue'
//import Colors from './Colors.vue'
import type { ComparisonItem, Deck } from '@/utils/types'
import DeckColumn from './DeckColumn.vue'
import { getColorManaCost, getNumericalManaCost, mapColorCodeToName} from '@/utils/deckUtils'

// 1️⃣ Grab selected decks and their cards
const {
  cardsInSelectedDeck,
  getCardsForDeckByIndex,
  listOfStoredDecks,
  resetCardsForSelectedDecks,
  selectedDecks
} = useDeckData()

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
    locked: d.locked
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
  const groups: Record<string, ComparisonItem[]> = {}
  // Initialize empty arrays for each type
  typeHierarchy.forEach(type => {
    groups[type] = []
  })

  // Group matrix rows by first matching type in hierarchy
  filteredMatrix.value.forEach(row => {
    const typeString = row.type || ''

    let matchedType: string | undefined = undefined
    if (typeString.includes('Land')) {
      matchedType = 'Land'
    } else {
      matchedType = typeHierarchy.find(type => typeString.includes(type))
    }

    if (matchedType) {
      const item: ComparisonItem = { name: row.name, counts: [...row.counts], mana_cost: row.mana_cost ?? '', }
      row.counts.forEach((count, idx) => {
        item[`col${idx}`] = count > 0 ? count : '-'
      })
      groups[matchedType].push(item)
    }
  })
  return groups
})

const sharedCardRows = computed(() => {
  const groups = groupedItems.value as Record<string, ComparisonItem[]>
  return typeHierarchy.flatMap(type => groups[type] ?? [])
})

// 7️⃣ Generate table headers
const headers = computed(() => [
  { text: 'Card', value: 'name', align: 'start' },
  { text: 'Color', value: 'color', align: 'end' },  
  ...decks.value.map((d, i) => ({
    text: d.deck_name,
    value: `col${i}`,
    align: 'center',
    width: '80px'
  }))
])

// 8️⃣ Fetch cards when decks change
watch(selectedDecks, (newDecks) => {
    resetCardsForSelectedDecks(newDecks)
console.log('Decks in watcher:', newDecks)

    newDecks.forEach((deck, i) => {
      if (!cardsInSelectedDeck.value[i]?.length) {
        getCardsForDeckByIndex(deck.deck_id, i)
      }
    })
  },
  { immediate: true }
)

// 3️⃣ Reorder decks on drag
function onDeckReorder(evt: { oldIndex: number; newIndex: number }) {
  const moved = selectedDecks.value.splice(evt.oldIndex, 1)[0]
  selectedDecks.value.splice(evt.newIndex, 0, moved)
}
</script>

<template>
  <div class="deck-comparison-container">
  <!-- Deck Picker -->
    <v-combobox
      v-model="selectedDecks"
      :items="listOfStoredDecks"
      item-title="deck_name"
      item-value="deck_id"
      return-object
      multiple
      label="Compare Decks"
      chips
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

    <!-- Draggable Deck Columns -->
    <v-row no-gutters class="deck-columns">
      <draggable
        v-model="selectedDecks"
        item-key="deck_id"
        @end="onDeckReorder"
        :animation="200"
        tag="v-row"
      >
        <template #item="{ element, index }">
          <v-col cols="auto">
            <DeckColumn
              :deck="element"
              :index="index"
              :sharedCardRows="sharedCardRows"
            />
          </v-col>
        </template>
      </draggable>
    </v-row>
  </div>
</template>

<style>
.comparison-container {
  overflow-x: auto;
}

.type-filter {
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
}

.type-banner td {
  background: #e0e0e0;
  font-weight: bold;
  text-transform: uppercase;
  padding: 6px 8px;
}

.no-overlap {
  padding: 8px;
  background: #ffecec;
  color: #a00;
  font-weight: bold;
  text-align: center;
}

.common {
  font-weight: bold;
  color: #1b5e20;
}

.partial {
  color: #f57c00;
}

.card-name-cell {
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-color-cell {
  text-align: right;
  white-space: nowrap;
}

/* .header-row th {
  background: #f5f5f5;
  font-weight: bold;
  padding: 6px 8px;
  text-align: center;
}
 */
.deck-header-cell {
  text-align: center;
  white-space: nowrap;
}

.card-name {
  margin-right: 6px;
}

.card-name-text {
  font-weight: 500;
  padding-right: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mana-symbols {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
}

.header-row th,
.comparison-table td {
  padding: 6px 8px;
  vertical-align: middle;
}

.color-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 2px;
}

.card-name-wrapper {
  display: flex;
  max-width: 480px;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.card-name-left {
  text-align: left;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-mana-right {
  text-align: right;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}

.deck-comparison-container {
  padding: 16px;
  overflow-x: auto;
}

.deck-columns {
  display: flex;
  gap: 12px;
}
</style>
