<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchMagicSetData } from '@/api/dashboard'

console.log('Symbol Base URL:', import.meta.env.VITE_SYMBOL_BASE_URL)
console.log('All env:', import.meta.env)

const symbolBaseUrl = import.meta.env.VITE_SYMBOL_BASE_URL
const sets = ref([])
const sortKey = ref('release_date')
const sortAsc = ref(true)
const failedImages = new Set() // track failed images

const fetchSets = async () => {
  const data = await fetchMagicSetData()
  sets.value = data
}

const sortBy = (key) => {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

const sortedSets = computed(() => {
  return [...sets.value].sort((a, b) => {
    const valA = a[sortKey.value]
    const valB = b[sortKey.value]
    if (valA < valB) return sortAsc.value ? -1 : 1
    if (valA > valB) return sortAsc.value ? 1 : -1
    return 0
  })
})

const filterText = ref('')

const filteredSets = computed(() => {
  const query = filterText.value.trim().toLowerCase()
  if (!query) return sortedSets.value

  const fuzzyYearRange = query.match(/^~?(\d{4})-~?(\d{4})$/)
  return sortedSets.value.filter((set) => {
    const name = set.set_name.toLowerCase()
    const code = set.official_set_code.toLowerCase()
    const total = String(set.total_cards)
    const release = new Date(set.release_date)
    const releaseYear = release.getFullYear()

    if (fuzzyYearRange) {
      const start = parseInt(fuzzyYearRange[1])
      const end = parseInt(fuzzyYearRange[2])
      return releaseYear >= start - 1 && releaseYear <= end + 1
    }

    return (
      name.includes(query) ||
      code.includes(query) ||
      total.includes(query) ||
      releaseYear.toString().includes(query)
    )
  })
})

const symbolUrl = (code) =>
  `${symbolBaseUrl}/set-symbols/${code}.png`

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

const onImageError = (e, code) => {
  if (!failedImages.has(code)) {
    failedImages.add(code)
    e.target.src = `${symbolBaseUrl}/unknown-set.png`
  }
}

onMounted(fetchSets)
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Magic Set Dashboard</h1>
    <div class="mb-4">
    <input
        v-model="filterText"
        type="text"
        placeholder="Filter sets (e.g. 1996-1997, ~1996-~1997, Mirage)"
        class="border px-3 py-2 rounded w-full max-w-md"
    />
    </div>
    <table class="min-w-full border border-gray-300">
      <thead>
        <tr class="bg-gray-100">
          <th @click="sortBy('set_name')" class="cursor-pointer px-4 py-2">Set Name</th>
          <th @click="sortBy('official_set_code')" class="cursor-pointer px-4 py-2">Code</th>
          <th class="px-4 py-2">Symbol</th>
          <th @click="sortBy('release_date')" class="cursor-pointer px-4 py-2">Release Date</th>
          <th @click="sortBy('total_cards')" class="cursor-pointer px-4 py-2">Total Cards</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="set in filteredSets" :key="set.id" class="border-t">
          <td class="px-4 py-2">{{ set.set_name }}</td>
          <td class="px-4 py-2">{{ set.official_set_code }}</td>
          <td class="px-4 py-2">
            <img
            :src="symbolUrl(set.set_name)"
            :alt="`${set.set_name} Symbol`"
            :key="failedImages.has(set.set_name) ? `${set.set_name}-fallback` : set.set_name"
            style="width: 32px; height: 32px; object-fit: contain;"
            loading="lazy"
            @error="onImageError($event, set.set_name)"
            />
          </td>
          <td class="px-4 py-2">{{ formatDate(set.release_date) }}</td>
          <td class="px-4 py-2">{{ set.total_cards }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>