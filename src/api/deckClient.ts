import { laravel_api as api } from './client'
import { getCSRF } from '@/api/auth';
import { DeckImportDTO } from '@/utils/deckTypes';

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

export async function storeDeckFromDTO(deckToImport: DeckImportDTO) {
  const response = await api.post('/api/deck/fromDTO', deckToImport)
  return response
}

export async function importDeckDataFromUrl(url: string) {
  const response = await api.post('/api/deck/import-deck-from-url', { url })
  return response
}

export async function retrieveCardsForDeck(deck_id: any) {
    const response = await api.post(`/api/cardsInDeck/${deck_id}`)
    return response.data || []
}

export async function retrieveCardsForDeckByBoardGroup(deck_id: any, board_groups: string) {
    const response = await api.post(`/api/cardsInDeck/${deck_id}/boardgroups/${board_groups}`)
    return response.data || []
}

export async function retrieveSideboardForDeck(deck_id: any) {
    const response = await api.post(`/api/sideboard/${deck_id}`)
    return response.data || []
}

export async function deleteDeckById(deck_id: number) {
    await getCSRF()
    const response = await api.delete(`/api/decks/${deck_id}`)
    return response.data || []
}
