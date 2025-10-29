import { laravel_api as api } from './client'

export async function retrieveCollections() {
  const response = await api.get('/api/collections')
  return response
}

export async function retrieveNormalizedInventory(payload) {
  const response = await api.post('/api/inventory/lookup-normalized', payload)
  return response
}
