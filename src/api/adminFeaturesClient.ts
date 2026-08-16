import { laravel_api as api } from './client'

export async function fetchSiteFeatures() {
    const response = await api.get(`/api/site-features`)
    return response.data || []
}

export async function fetchSiteFeaturesForMode(site_mode: string) {
    const response = await api.get(`/api/site-features/mode/${site_mode}`)
    return response.data || []
}

export async function fetchAllSiteModes() {
    const response = await api.get(`/api/site-modes`)
    return response.data || []
}