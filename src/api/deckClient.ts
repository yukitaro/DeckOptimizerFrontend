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

export async function getKnownArchetypes() {
  const response = await api.get(`/api/decks/known-archetypes`)
  return response
}

export async function storeDeck(payload) {
  const response = await api.post('/api/deck', payload)
  return response
}

export async function importDeckDataFromUrl(url: string) {
  const response = await api.post('/api/deck/import-deck-from-url', { url })
  return response
}