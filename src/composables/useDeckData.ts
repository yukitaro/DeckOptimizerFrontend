import { Deck, Card } from '@/utils/types'
import { ref } from 'vue'
import axios from 'axios'
import { retrieveCardsForDeck } from '@/utils/deckUtils';

const base_url = "http://localhost:80";

const cardsInSelectedDeck = ref<Card[][]>([])
const listOfStoredDecks = ref<Deck[]>([])

const dictOfCardImageUrls = ref<Record<string, string>>({})

export function useDeckData() {
  const selectedDecks = ref<Deck[]>([])

  async function getCardsForDeck(deck_id: number) {
    try {
      const response = await axios.get(`${base_url}/api/cardsInDeck/${deck_id}`)

      const cards: Card[] = response.data
      cardsInSelectedDeck.value.push(cards)
      // Populate image URL dictionary
      for (const card of response.data) {
        if (card.name && card.image_url_to_use) {
          dictOfCardImageUrls.value[card.name] = card.image_url_to_use
        }
      }
    } catch (err) {
      console.error(`Failed to fetch cards for deck ${deck_id}`, err)
      return []
    }
  }

  async function getCardsForDeckByIndex(deck_id: number, index: number) {
    try {
      const cards: Card[] = await retrieveCardsForDeck(deck_id)

      cardsInSelectedDeck.value[index] = cards

      for (const card of cards) {
        if (card.name && card.image_url_to_use) {
          dictOfCardImageUrls.value[card.name] = card.image_url_to_use
        }
      }      
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
    dictOfCardImageUrls,
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