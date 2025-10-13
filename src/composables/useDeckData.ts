import { Deck, Card } from '@/utils/types'
import { nextTick, ref } from 'vue'
import axios from 'axios'
import { retrieveCardsForDeck, retrieveCardsForDeckByBoardGroup, retrieveSideboardForDeck } from '@/utils/deckUtils';

const base_url = "http://localhost:80";

const cardsInSelectedDeck = ref<Card[][]>([])
const cardsInSideboardOfSelectedDeck = ref<Card[][]>([])
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

  async function getCardsForDeckByIndex(deck_id: number, index: number, board_groups: string = "main,side") {
    try {
      const response = await retrieveCardsForDeckByBoardGroup(deck_id, board_groups)
      const cards: Card[] = response[`main`]
      const sideboardCards: Card[] = response[`side`]
      
      cardsInSelectedDeck.value[index] = cards
      cardsInSideboardOfSelectedDeck.value[index] = sideboardCards

      for (const card of cards) {
        if (card.name && card.image_url_to_use) {
          dictOfCardImageUrls.value[card.name] = card.image_url_to_use
        }
      }

      for (const card of sideboardCards) {
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

  async function getDeckArchetypesInDB() {
    try {
      const response = await axios.get(`${base_url}/api/decks/archetypes`)
      return response.data
    } catch (error) {
      //console.error("Error fetching deck archetypes:", error)
      console.log("Oh no, couldn't retrieve archetypes!")
    }
  }

  async function getDecksFromDB() {
      try {
          const response = await axios.get(`${base_url}/api/decks`, {
              params: {
                  limit: 10
              }
          });

          if (response.data.errors && response.data.errors.length > 0) {
          } else {
            setDecks(response.data.map(deckData => ({
                  deck_id: deckData.id,
                  deck_name: deckData.deck_name,
                  description: deckData.description,
                  archetype: deckData.archetype ?? 'Unknown'
              })))
            console.log("Complete return value: " + JSON.stringify(listOfStoredDecks.value));
          }
      } catch (error) {
          console.log("oops an error!" + error);
      }    
  }


  function setDecks(decks: any[]) {
    listOfStoredDecks.value = decks
  }

  async function deleteDeck(deckId: number) {
    await axios.delete(`${base_url}/api/decks/${deckId}`);
  }

  function resetCardsForSelectedDecks(newDecks: Deck[]) {
    cardsInSelectedDeck.value = newDecks.map(() => [])
    cardsInSideboardOfSelectedDeck.value = newDecks.map(() => [])
  }

  function addDeckForComparison(deck: Deck) {
    selectedDecks.value.push(deck)
  }

  function removeDeck(deckId: number) {
    selectedDecks.value = selectedDecks.value.filter((d: Deck) => d.deck_id !== deckId)
  }

  function moveDeckImmutable(from: number, to: number) {
    const decks = [...selectedDecks.value]
    const cards = [...cardsInSelectedDeck.value]
    const sideboardCards = [...cardsInSideboardOfSelectedDeck.value]

    const deck = decks.splice(from, 1)[0]
    decks.splice(to, 0, deck)

    const cardGroup = cards.splice(from, 1)[0]
    cards.splice(to, 0, cardGroup)

    const sideboardGroup = sideboardCards.splice(from, 1)[0]
    sideboardCards.splice(to, 0, sideboardGroup)

    selectedDecks.value = decks
    cardsInSelectedDeck.value = cards
    cardsInSideboardOfSelectedDeck.value = sideboardCards
  }


  // 8️⃣ Fetch cards when decks change
  async function handleSingleDeckChange(newSelection: Deck) {
    // 1️⃣ update selection
    selectedDecks.value = []
    cardsInSelectedDeck.value = []
    cardsInSideboardOfSelectedDeck.value = []

    if (newSelection) {
      selectedDecks.value = [ newSelection ]
      cardsInSelectedDeck.value = [[]]
      cardsInSideboardOfSelectedDeck.value = [[]]
    }

    // 3️⃣ fetch each deck's cards
    await nextTick()
    getCardsForDeckByIndex(newSelection.deck_id, 0)
  }  

  return {
    addDeckForComparison,
    cardsInSelectedDeck,
    cardsInSideboardOfSelectedDeck,
    deleteDeck,
    dictOfCardImageUrls,
    getCardsForDeck,
    getCardsForDeckByIndex,
    getDeckArchetypesInDB,
    getDecksFromDB,
    handleSingleDeckChange,
    listOfStoredDecks,
    moveDeckImmutable,
    removeDeck,
    resetCardsForSelectedDecks,
    selectedDecks,
    setDecks,
  }
}