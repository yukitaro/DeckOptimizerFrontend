import { laravel_api as api } from './client'

export async function getCardPrices(normalizedIds: number[]) {
  const response = await api.post('/api/fetch-card-prices',
    { card_data_normalized_ids: normalizedIds },
    { headers: { 'Content-Type': 'application/json' } }
  )

  console.log('Price client response:', response);

  return response.data;
}
