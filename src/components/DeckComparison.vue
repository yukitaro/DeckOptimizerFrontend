<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios';

const base_url = "http://localhost:80";

const props = defineProps({
  listOfStoredDecks: Array
})

onMounted(() => {
  console.log('DeckComparison.vue mounted')
  console.log('listOfStoredDecks:', props.listOfStoredDecks)
})

async function fetchCardsForDeck(deck_id) {
  // Replace with your actual fetch logic
    //const response = await axios.get(`${base_url}/api/cardsInDeck/${deck_id}`)
    const response = await axios.get(`${base_url}/api/cardsInDeck/${deck_id}`)
      //const response = axios.get(`http://localhost:8000/api/cardsInDeck/${newDeck.deck_id}`)
    return response.data || []
}

const selectedDecks = ref([])

watch(selectedDecks, async (newDecks) => {
  for (const deck of newDecks) {
    if (!deck.cards || deck.cards.length === 0) {
      deck.cards = await fetchCardsForDeck(deck.deck_id)
    }
  }
})

const sharedCardMap = computed(() => {
  const map = {}
  for (const deck of selectedDecks.value) {
    for (const card of deck.cards || []) {
      const key = card.name
      map[key] = map[key] || { count: 0, decks: [] }
      map[key].count += card.card_count
      map[key].decks.push(deck.deck_name)
    }
  }
  return map
})

const commonCards = computed(() =>
  Object.entries(sharedCardMap.value)
    .filter(([_, data]) => data.decks.length > 1)
    .map(([name, data]) => ({
      name,
      count: data.count,
      decks: data.decks
    }))
)

function isShared(name) {
  return commonCards.value.some(c => c.name === name)
}
</script>


<template>
  <v-card class="pa-4 custom-card-background">
    <!-- 🔍 Multi-deck selector -->
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

    <!-- 📊 Shared card summary -->
    <div v-if="commonCards.length" class="mb-4">
      <h3>Shared Cards</h3>
      <ul>
        <li v-for="card in commonCards" :key="card.name">
          {{ card.name }} — {{ card.count }} total across {{ card.decks.length }} decks
        </li>
      </ul>
    </div>

    <!-- 📦 Side-by-side deck rendering -->
    <div class="deck-comparison-flex">
      <div
        v-for="deck in selectedDecks"
        :key="deck.deck_id"
        class="deck-column"
      >
        <h4>{{ deck.deck_name }}</h4>
        <p>{{ deck.description }}</p>

        <div class="card-list">
          <div
            v-for="card in deck.cards"
            :key="card.id"
            :class="['card-line', isShared(card.name) ? 'shared-card' : '']"
          >
            <strong>{{ card.card_count }}x</strong> {{ card.name }} — {{ card.type }}
          </div>
        </div>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.deck-comparison-flex {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.deck-column {
  flex: 1;
  min-width: 300px;
  padding: 12px;
  background-color: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.card-line {
  font-size: 14px;
  padding: 4px 0;
}

.shared-card {
  background-color: #e3f2fd;
  border-left: 4px solid #1976d2;
  padding-left: 8px;
}
</style>