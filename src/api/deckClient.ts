import { laravel_api as api } from './client'

export async function getStoredDecks( params = {}) {
  const response = await api.get(`/api/decks`, { params })
  return response
}

export async function getAllDeckArchetypes() {
  const response = await api.get(`/api/decks/archetypes`)
  return response
}

export async function getCardsForDeckAPI(deckId: number) {
  const response = await api.get(`/api/cardsInDeck/${deckId}`)
  return response
}


