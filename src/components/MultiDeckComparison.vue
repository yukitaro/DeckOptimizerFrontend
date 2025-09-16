<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDeckData } from '@/composables/useDeckData'
import { buildComparisonMatrix } from '@/utils/deckComparisonUtils'
import Colors from './Colors.vue'
import type { ComparisonItem, Deck } from '@/utils/types'
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
    id: d.id,
    name: d.name,
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

// 7️⃣ Generate table headers
const headers = computed(() => [
  { text: 'Card', value: 'name', align: 'start' },
  ...decks.value.map((d, i) => ({
    text: d.name,
    value: `col${i}`,
    align: 'center',
    width: '80px'
  }))
])

// 8️⃣ Fetch cards when decks change
watch(selectedDecks, (newDecks) => {
    resetCardsForSelectedDecks(newDecks)

    newDecks.forEach((deck, i) => {
      if (!cardsInSelectedDeck.value[i]?.length) {
        getCardsForDeckByIndex(deck.deck_id, i)
      }
    })
  },
  { immediate: true }
)
</script>

<template>
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

  <div class="comparison-container">
    <!-- No-overlap banner -->
    <div v-if="!filteredMatrix.length" class="no-overlap">
      No cards match the selected types across all selected decks
    </div>

    <!-- Grouped Table -->
    <v-data-table
      :headers="headers"
      hide-default-footer
      dense
      class="elevation-1"
    >
      <template v-for="type in typeHierarchy" :key="type">
        <template v-if="selectedTypes.includes(type)">
          <!-- Type Banner -->
          <tr class="type-banner">
            <td :colspan="headers.length">{{ type }}</td>
          </tr>
          <!-- Rows for this type -->
          <tr v-for="item in groupedItems[type]"
            :key="item.name"
            :class="{
              common: item.counts.every(c => c > 0),
              partial: item.counts.some(c => c > 0) && !item.counts.every(c => c > 0)
            }"
          >
            <td><span>{{ item.name }} <Colors :mana_cost="getNumericalManaCost(item.mana_cost)" />
                <span v-for="color in getColorManaCost(item.mana_cost)" :key="color"><Colors :color_name="mapColorCodeToName(color)" /></span>
                </span>
            </td>
            <td v-for="(header, i) in headers.slice(1)" :key="i">
              {{ item[`col${i}`] }}
            </td>
          </tr>
        </template>
      </template>
    </v-data-table>
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
</style>
