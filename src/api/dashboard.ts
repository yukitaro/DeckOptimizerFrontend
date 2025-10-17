import { laravel_api as api } from './client'

export async function fetchDataCoverage(setName?: string) {
  const endpoint = setName
    ? `/api/dashboard/data-coverage/${setName}`
    : `/api/dashboard/data-coverage`

  const response = await api.get(endpoint)
  return response.data
}

export async function fetchImageCoverage() {
  const response = await api.get('/api/dashboard/image-coverage')
  return response.data
}