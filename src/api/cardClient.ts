import { laravel_api as api } from './client'

export async function getCardData(card_id: string) {
  return await api.get(`/api/card/${card_id}`);
}

export async function getCardDataBySlugAndNumber(set: string, slug: string, number: string) {
  return await api.get(`/api/dashboard/card/${set}/${slug}/${number}`);
}

