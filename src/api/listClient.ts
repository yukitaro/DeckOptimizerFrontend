import { laravel_api as api } from './client'
import { Card } from '@/utils/types';

export async function addMTGCardToDynamicList(card: Card, listName: string, isFoil: boolean) {
  return api.post('/api/lists/add-card', {
    list_name: listName,
    card_id: card.id,
    is_foil: isFoil ?? false
  })
}

export async function getListWithItems(id: string) {
  const response = await api.get(`/api/lists/${id}`)
  return response.data.items
}

export async function getUserLists() {
  const response = await api.get('/api/lists')
  return response.data
}

export async function updateListItem(listId: number, itemId: number, data: any) {
  return api.put(`/api/lists/${listId}/items/${itemId}`, data);
}