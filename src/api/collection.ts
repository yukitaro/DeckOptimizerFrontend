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

export async function retrieveInventory(params?: Record<string, unknown>) {
  const response = await api.get('/api/inventory', { params })
  return response.data
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

export async function moveSingleCard(collectionId: number, cardId: number, payload: { moved_qty: number; target_collection_id: number }) {
  const response = await api.post(`/api/collections/${collectionId}/cards/${cardId}/move`, payload)
  return response
}

export async function exportCollection(collectionId: number): Promise<void> {
  const response = await api.get(`/api/collections/${collectionId}/export`, {
    responseType: 'blob',
  })

  // Parse filename from Content-Disposition header if present, or fallback
  const contentDisposition = response.headers['content-disposition']
  let filename = `collection-${collectionId}.csv`

  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    if (match?.[1]) filename = match[1]
  }

  // Create temporary Blob URL and trigger browser download
  const blob = new Blob([response.data], { type: 'text/csv' })
  const downloadUrl = window.URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()

  // Clean up DOM and revoke object URL
  link.remove()
  window.URL.revokeObjectURL(downloadUrl)
}