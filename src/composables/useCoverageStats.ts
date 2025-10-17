import { ref } from 'vue'
import axios from 'axios'

export function useCoverageStats() {
  const stats = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchCoverage(setName?: string) {
    loading.value = true
    error.value = null

    try {
      const endpoint = setName
        ? `/api/dashboard/data-coverage/${setName}`
        : `/api/dashboard/data-coverage`

      const response = await axios.get(endpoint)
      stats.value = response.data
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, error, fetchCoverage }
}
