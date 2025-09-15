<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDeckData } from '@/composables/useDeckData'
import { buildComparisonMatrix } from '@/utils/deckComparisonUtils'
import type { ComparisonItem, Deck } from '@/utils/types'

// 1️⃣ Grab selected decks and their cards
const { cardsInSelectedDeck, getCardsForDeckByIndex, listOfStoredDecks, selectedDecks } = useDeckData()

// Shape to Deck[]
const decks = computed<Deck[]>(() =>
  selectedDecks.value.map((d, i) => ({
    id: d.id,
    name: d.name,
    cards: cardsInSelectedDeck.value[i] || [],
    locked: d.locked,
  }))
)

// 3️⃣ Build the comparison matrix
const matrix = computed(() => buildComparisonMatrix(decks.value))

// 4️⃣ Generate table headers
const headers = computed(() => [
  { text: 'Card', value: 'name', align: 'start' },
  ...decks.value.map((d, i) => ({
    text: d.name,
    value: `col${i}`,
    align: 'center',
    width: '80px'
  }))
])

// 5️⃣ Map matrix rows into v-data-table items
const items = computed<ComparisonItem[]>(() =>
  matrix.value.map(row => {
    const item: ComparisonItem = { name: row.name }
    row.counts.forEach((count, idx) => {
      item[`col${idx}`] = count > 0 ? count : '-'
    })
    return item
  })
)

// whenever the selection changes, fetch its cards into the shared array
watch(
  selectedDecks,
  (newDecks) => {
    newDecks.forEach((deck, i) => {
      // only refetch if we don't already have this deck’s cards
      if (!cardsInSelectedDeck.value[i]?.length) {
        getCardsForDeckByIndex(deck.deck_id, i)
      }
    })
  },
  { immediate: true }
)
</script>

<template>
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
  <div class="comparison-container">
    <!-- No-overlap banner -->
    <div v-if="!matrix.some(row => row.counts.every(c => c > 0))" class="no-overlap">
      No cards common across all selected decks
    </div>

    <v-data-table
      :headers="headers"
      :items="items"
      hide-default-footer
      dense
      class="elevation-1"
    >
      <!-- Highlight fully-shared rows -->
      <template #item.name="{ item, index }">
        <span
          :class="{
            common: matrix[index].counts.every(c => c > 0),
            partial: matrix[index].counts.some(c => c > 0) && !matrix[index].counts.every(c => c > 0)
          }"
        >
          {{ item.name }}
        </span>
      </template>
    </v-data-table>
  </div>
</template>

<style>
.comparison-container {
  overflow-x: auto;
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
