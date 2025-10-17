import { laravel_api as api } from './client'

export async function getCardsForDeck(deckId: number) {
  const response = await api.get(`/api/cardsInDeck/${deckId}`)
  return response.data
}
