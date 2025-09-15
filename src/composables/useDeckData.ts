import { ref } from 'vue'
import axios from 'axios'

const base_url = "http://localhost:80";

const cardsInSelectedDeck = ref([])

export function useDeckData() {
  const listOfStoredDecks = ref([])
  const selectedDecks = ref([])

  async function fetchCardsForDeck(deck_id: number) {
    try {
      const response = await fetch(`/api/decks/${deck_id}/cards`)
      const data = await response.json()
      return data.cards || []
    } catch (err) {
      console.error(`Failed to fetch cards for deck ${deck_id}`, err)
      return []
    }
  }

  async function getCardsForDeck(deck_id: number) {
    try {
      const response = await axios.get(`${base_url}/api/cardsInDeck/${deck_id}`)

      cardsInSelectedDeck.value = response.data
    } catch (err) {
      console.error(`Failed to fetch cards for deck ${deck_id}`, err)
      return []
    }
  }

  function setDecks(decks: any[]) {
    listOfStoredDecks.value = decks
  }

  return {
    listOfStoredDecks,
    selectedDecks,
    setDecks,
    getCardsForDeck,
    cardsInSelectedDeck
  }
}