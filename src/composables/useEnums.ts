import { ref } from 'vue'
import axios from 'axios'

const enumsCache = ref(null)

export function useEnums() {
  const enums = ref(enumsCache.value)

  async function fetchEnums() {
    if (!enumsCache.value) {
      const { data } = await axios.get('/api/enums')
      enumsCache.value = data
      enums.value = data
    }
    return enums.value
  }

  return { enums, fetchEnums }
}
