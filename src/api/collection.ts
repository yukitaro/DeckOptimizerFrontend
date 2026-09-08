import { laravel_api as api } from './client'
import { Collection, UpdateCollectionPayload } from '@/utils/types'

export async function createNewCollection({ name, description }: { name: string; description: string }) {
  const response = await api.post('/api/collections/create', {
    name,
    description,
  })
  return response
}

export async function retrieveCollections() {
  const response = await api.get('/api/collections')

  return response.data.map((aCollection: Collection) => ({
    ...aCollection
  }));
}

export async function retrieveNormalizedInventory(payload) {
  const response = await api.post('/api/inventory/lookup-normalized', payload)
  return response
}

export async function importCollectionFromExternalSource(formData) {
    const response = await api.post('/api/collections/import-csv', formData)
    return response
}

export async function pollServerForImportStatus(collectionId: number) {
    const response = await api.get(`/api/collections/${collectionId}/import-status`)
    return response
}

export async function viewCardsInCollection(collectionId: number,
  params?: Record<string, unknown>) {
    const response = await api.get(`/api/collections/${collectionId}/cards`, {
      params
    })
    return response
}

export async function deleteCollectionFromServer(collectionId: number) {
    const response = await api.delete(`/api/collections/${collectionId}`)
    return response
}

export async function updateCollectionData(collectionId: number | string, payload: UpdateCollectionPayload) {
  // Axios automatically serializes 'payload' to JSON and sets content-type header
  const response = await api.patch(`/api/collections/${collectionId}`, payload)
  return response.data
}