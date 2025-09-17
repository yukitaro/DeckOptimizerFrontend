import { Deck, Card } from '@/utils/types'
import { ref } from 'vue'
import axios from 'axios'
import { retrieveCardsForDeck } from '@/utils/deckUtils';

const base_url = "http://localhost:80";

const cardsInSelectedDeck = ref<Card[][]>([])
const listOfStoredDecks = ref<Deck[]>([])

export function useDeckData() {
  const selectedDecks = ref<Deck[]>([])

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
      const cards = await retrieveCardsForDeck(deck_id)

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

  function addDeckForComparison(deck: Deck) {
    selectedDecks.value.push(deck)
  }

  function removeDeck(deckId: number) {
    selectedDecks.value = selectedDecks.value.filter(d => d.deck_id !== deckId)
  }

  function moveDeckImmutable(from: number, to: number) {
    const decks = [...selectedDecks.value]
    const cards = [...cardsInSelectedDeck.value]

    const deck = decks.splice(from, 1)[0]
    decks.splice(to, 0, deck)

    const cardGroup = cards.splice(from, 1)[0]
    cards.splice(to, 0, cardGroup)

    selectedDecks.value = decks
    cardsInSelectedDeck.value = cards
  }

  return {
    addDeckForComparison,
    cardsInSelectedDeck,
    getCardsForDeck,
    getCardsForDeckByIndex,
    listOfStoredDecks,
    moveDeckImmutable,
    removeDeck,
    resetCardsForSelectedDecks,
    selectedDecks,
    setDecks,
  }
}