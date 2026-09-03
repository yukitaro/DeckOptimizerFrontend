import { laravel_api as api } from './client'
import { SetDataItem } from '@/utils/types';

export interface CardSearchParams {
  name?: string;
  sets?: string | string[];
  rarities?: string | string[];
  colors?: string | string[];
  limit?: number;
}

export async function getSetData() {
  const response = await api.get('/api/sets');

  return response.data.map(((aSetData: SetDataItem) => ({
    value: aSetData.set_name,
    title: aSetData.official_set_code + ' (' + aSetData.set_name + ')',
    official_set_name: aSetData.official_set_code
  })));
}

export async function getCardData(card_id: string) {
  return await api.get(`/api/card/${card_id}`);
}

export async function searchCardsByName(searchText: string, rarities: string) {
  return await api.get(`/api/cards/name/${searchText}/rarities/${rarities}`);
}
 
export async function getCardDataBySlugAndNumber(set: string, slug: string, number: string) {
  return await api.get(`/api/dashboard/card/${set}/${slug}/${number}`, { params: { limit: 100}});
}

export async function searchSetsByRarities(setNames: string, rarities?: string, resultLimit?: number, colorFilters?: string) {
  return await api.get(`/api/cardsfromsets/${setNames}/${rarities ?? ''}`, { params: { limit: resultLimit ??100, colorFilters: colorFilters ?? '' }});
}

export async function callConsolidatedCardsSearch(params: CardSearchParams = {}) {
  return await api.get(`/api/cards/search`, { params });
}