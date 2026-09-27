import { laravel_api as api } from './client'

export async function getCollectionSummary(collectionId: number) {
  return api.get(`/api/collections/${collectionId}/analytics/summary`)
}

export async function getSetBreakdown(collectionId: number) {
  return api.get(`/api/collections/${collectionId}/analytics/sets`)
}

export async function getRarityBreakdown(collectionId: number) {
  return api.get(`/api/collections/${collectionId}/analytics/rarity`)
}

export async function getFoilBreakdown(collectionId: number) {
  return api.get(`/api/collections/${collectionId}/analytics/foil`)
}

export async function getTopCards(collectionId: number) {
  return api.get(`/api/collections/${collectionId}/analytics/top`)
}

export async function getColorIdentityBreakdown(collectionId: number) {
  return api.get(`/api/collections/${collectionId}/analytics/colors`)
}

export async function getTopPauperStaples(archetypes: string[], sets: string[] = [], exclusiveToSet: boolean = false, mtgCardTypesSelected: string[] = [], ownedThreshold: string = '') {
  return api.get(`/api/analytics/top-pauper-staples`, {
    params: {
      archetypes: archetypes.join(','),
      sets: sets.join(','),
      exclusive_to_set: exclusiveToSet,
      mtg_card_types: mtgCardTypesSelected.join(','),
      owned_threshold: ownedThreshold
    }
  })
}