import { Deck, Card } from '@/utils/types'
import { ref } from 'vue'
import axios from 'axios'
import { retrieveCardsForDeck } from '@/utils/deckUtils';

const base_url = "http://localhost:80";

const cardsInSelectedDeck = ref<Card[][]>([])
const listOfStoredDecks = ref<Deck[]>([])

export function useDeckData() {
  const selectedDecks = ref<Deck[]>([])

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

  async function getCardsForDeckByIndex(deck_id: number, index: number) {
    try {
      const cards = await await retrieveCardsForDeck(deck_id)

      cardsInSelectedDeck.value[index] = cards
    } catch (err) {
      console.error(`Failed to fetch cards for deck ${deck_id}`, err)
      return []
    }
  }

  function reloadStoredDecks() {
    // function here to reload the list of stored decks.
    // should call this after we import a new deck
    // bonus points if we only retrieve the new one(s)
  }

  function setDecks(decks: any[]) {
    listOfStoredDecks.value = decks
  }

  function resetCardsForSelectedDecks(newDecks: Deck[]) {
      cardsInSelectedDeck.value = newDecks.map(() => [])
  }

  return {
    listOfStoredDecks,
    getCardsForDeck,
    getCardsForDeckByIndex,
    cardsInSelectedDeck,
    resetCardsForSelectedDecks,
    selectedDecks,
    setDecks,
  }
}