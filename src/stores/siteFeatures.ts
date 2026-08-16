// stores/siteFeatures.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SiteFeature, SiteMode } from '@/utils/types'
import { fetchSiteFeatures } from '@/api/adminFeaturesClient'

export const useSiteFeaturesStore = defineStore('siteFeatures', () => {
  const features = ref<SiteFeature[]>([])
  const isLoaded = ref(false)

  const siteModes = computed(() => {
    // unique site_mode values in stable order
    const modes: string[] = []
    for (const f of features.value) {
      if (!modes.includes(f.site_mode)) modes.push(f.site_mode)
    }
    return modes
  })

  const byMode = computed(() => {
    const map = new Map<string, SiteFeature[]>()
    for (const f of features.value) {
      if (!map.has(f.site_mode)) map.set(f.site_mode, [])
      map.get(f.site_mode)!.push(f)
    }
    for (const arr of map.values()) arr.sort((a,b) => (a.sort_order||0) - (b.sort_order||0))
    return map
  })

  function getFeaturesForMode(mode?: string) {
    if (!mode) return []
    return (byMode.value.get(mode) || []).filter(f => f.is_enabled !== false)
  }

  async function fetchAll() {
    // prefer API; fallback to local config endpoint
    try {
      const data = await fetchSiteFeatures() // returns SiteFeature[]
      features.value = data
      isLoaded.value = true
    } catch (err) {
      console.error('Failed to fetch site features', err)
      // optionally load from a static JSON endpoint or leave empty
    }
  }

  return {
    features,
    isLoaded,
    byMode,
    getFeaturesForMode,
    fetchAll
  }
})
