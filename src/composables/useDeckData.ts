import { Deck, Card } from '@/utils/types'
import { nextTick, ref, watch  } from 'vue'
import { deleteDeckById, getAllDeckArchetypes, getCardsForDeckAPI, getStoredDecks, retrieveCardsForDeck, retrieveCardsForDeckByBoardGroup, retrieveSideboardForDeck } from '@/api/deckClient';
import type { DeckImportDTO } from '@/utils/types'

const cardsInSelectedDeck = ref<Card[][]>([])
const cardsInSideboardOfSelectedDeck = ref<Card[][]>([])
const listOfStoredDecks = ref<Deck[]>([])
const isLoadingDecks = ref<boolean>(false)
const recentlyImportedDecks = ref<Deck[]>([])
const isLoadingRecentDecks = ref<boolean>(false)

const dictOfCardImageUrls = ref<Record<string, string>>({})

export function useDeckData() {
  const selectedDecks = ref<Deck[]>([])
  const isLoadingDeckCards = ref(false)

  async function getCardsForDeck(deck_id: number): Promise<Card[]> {
    isLoadingDeckCards.value = true
    try {
      const response = await getCardsForDeckAPI(deck_id)
      const cards: Card[] = response.data || []
      // push card array as a new slot (preserve existing index semantics)
      cardsInSelectedDeck.value.push(cards)

      // Populate image URL dictionary
      for (const card of cards) {
        if (card.name && card.image_url_to_use) {
          dictOfCardImageUrls.value[card.name] = card.image_url_to_use
        }
      }

      return cards
    } catch (err) {
      console.error(`Failed to fetch cards for deck ${deck_id}`, err)
      return []
    } finally {
      isLoadingDeckCards.value = false
    }
  }

  async function getCardsForDeckByIndex(deck_id: number, index: number, board_groups: string = "main,side"): Promise<{ main: Card[]; side: Card[] } | null> {
    isLoadingDeckCards.value = true
    try {
      const response = await retrieveCardsForDeckByBoardGroup(deck_id, board_groups)

      // normalize response shape: ensure arrays
      const mainCards: Card[] = (response?.main ?? []) as Card[]
      const sideboardCards: Card[] = (response?.side ?? []) as Card[]

      // ensure arrays are allocated at index
      if (!Array.isArray(cardsInSelectedDeck.value)) cardsInSelectedDeck.value = []
      if (!Array.isArray(cardsInSideboardOfSelectedDeck.value)) cardsInSideboardOfSelectedDeck.value = []

      cardsInSelectedDeck.value[index] = mainCards
      cardsInSideboardOfSelectedDeck.value[index] = sideboardCards

      for (const card of mainCards) {
        if (card.name && card.image_url_to_use) {
          dictOfCardImageUrls.value[card.name] = card.image_url_to_use
        }
      }
      for (const card of sideboardCards) {
        if (card.name && card.image_url_to_use) {
          dictOfCardImageUrls.value[card.name] = card.image_url_to_use
        }
      }

      return { main: mainCards, side: sideboardCards }
    } catch (err) {
      console.error(`Failed to fetch cards for deck ${deck_id}`, err)
      return null
    } finally {
      isLoadingDeckCards.value = false
    }
  }

  function createDeckDTO(rawDeckData: any): DeckImportDTO {
    return ({
        name: rawDeckData.name,
        description: rawDeckData.description,
        mainboard: rawDeckData.mainboard ?? [],
        sideboard: rawDeckData.sideboard ?? [],
        sourceUrl: rawDeckData.sourceUrl,
        format: rawDeckData.format,
        archetype: rawDeckData.archetype ?? null,
        tags: rawDeckData.tags ?? []
    })
  }

  async function reloadStoredDecks() {
    isLoadingDecks.value = true
    try {
      const response = await getStoredDecks()
      if (response.data?.errors && response.data.errors.length > 0) {
        // ignore for now or surface errors elsewhere
      } else if (Array.isArray(response.data)) {
        setDecks(response.data.map(deckData => ({
          deck_id: deckData.id,
          deck_name: deckData.deck_name,
          description: deckData.description,
          archetype: deckData.archetype ?? 'Unknown'
        })))
      }
    } catch (err) {
      console.error('Failed to reload decks', err)
    } finally {
      isLoadingDecks.value = false
    }
  }

  async function getDeckArchetypesInDB() {
    try {
      const response = await getAllDeckArchetypes()
      return response.data
    } catch (error) {
      console.log("Oh no, couldn't retrieve archetypes!")
      return []
    }
  }

  async function getDecksFromDB() {
    try {
      const response = await getStoredDecks({ limit: 100 })
      if (response.data?.errors && response.data.errors.length > 0) {
        // handle errors as needed
      } else if (Array.isArray(response.data)) {
        setDecks(response.data.map(deckData => ({
          deck_id: deckData.id,
          deck_name: deckData.deck_name,
          description: deckData.description,
          archetype: deckData.archetype ?? 'Unknown'
        })))
      }
    } catch (error) {
      console.error("Failed to fetch decks from DB", error)
    }
  }

  function setDecks(decks: any[]) {
    listOfStoredDecks.value = decks
  }

  async function deleteDeck(deckId: number) {
    await deleteDeckById(deckId)
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

  // Hydrate and return cards for a single deck selection; deterministic/awaitable
  async function handleSingleDeckChange(newSelection: Deck | null): Promise<Card[] | null> {
    // reset selection state
    selectedDecks.value = []
    cardsInSelectedDeck.value = []
    cardsInSideboardOfSelectedDeck.value = []

    if (!newSelection) {
      return null
    }

    selectedDecks.value = [ newSelection ]
    // preallocate arrays so UI indexing is stable
    cardsInSelectedDeck.value = [[]]
    cardsInSideboardOfSelectedDeck.value = [[]]

    // ensure DOM updates settle before network call (optional)
    await nextTick()

    // await the actual network call so callers can depend on completion
    const result = await getCardsForDeckByIndex(newSelection.deck_id, 0)
    return result?.main ?? []
  }

  // Watch listOfStoredDecks and fetch recent decks; run immediately at setup
  watch(listOfStoredDecks, async () => {
    isLoadingRecentDecks.value = true;
    try {
      const response = await getStoredDecks({ retrieveRecent: 5 })
      if (Array.isArray(response.data)) {
        recentlyImportedDecks.value = response.data.map(deckData => ({
          deck_id: deckData.id,
          deck_name: deckData.deck_name,
          description: deckData.description,
          archetype: deckData.archetype ?? 'Unknown'
        }))
      } else {
        recentlyImportedDecks.value = response.data ?? []
      }
    } catch (err) {
      console.error('Failed to fetch recent decks', err);
    } finally {
      isLoadingRecentDecks.value = false;
    }
  }, { immediate: true })

  return {
    addDeckForComparison,
    cardsInSelectedDeck,
    cardsInSideboardOfSelectedDeck,
    createDeckDTO,
    deleteDeck,
    dictOfCardImageUrls,
    getCardsForDeck,
    getCardsForDeckByIndex,
    getDeckArchetypesInDB,
    getDecksFromDB,
    handleSingleDeckChange,
    isLoadingDecks,
    isLoadingDeckCards,
    isLoadingRecentDecks,
    listOfStoredDecks,
    moveDeckImmutable,
    recentlyImportedDecks,
    reloadStoredDecks,
    removeDeck,
    resetCardsForSelectedDecks,
    selectedDecks,
    setDecks,
  }
}
