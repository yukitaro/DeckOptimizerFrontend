<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchDataCoverage } from '@/api/dashboard'
import DashboardCard from './DashboardCard.vue'

const stats = ref([])
const loading = ref(true)
const showIncompleteOnly = ref(true)

const headers = [
  { title: 'Set', key: 'set_name', sortable: true },
  { title: 'Release Date', key: 'release_date', sortable: true },
  { title: 'Total', key: 'total_raw_cards', sortable: true },
  { title: 'Metadata %', key: 'metadata_pct', sortable: true },
  { title: 'Normalized %', key: 'normalization_pct', sortable: true },
  { title: 'Image %', key: 'image_pct', sortable: true },
  { title: 'Missing Enrichment', key: 'missing_enrichment_timestamp', sortable: true },
  { title: 'Logic Versions', key: 'logic_versions_used', sortable: true }
]

function formatDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString() : '—'
}

const filteredStats = computed(() => {
  if (!showIncompleteOnly.value) return stats.value
  return stats.value.filter(row =>
    parseFloat(row.normalization_pct) < 100 ||
    parseFloat(row.image_pct) < 100
  )
})

onMounted(async () => {
  try {
    stats.value = await fetchDataCoverage()
  } catch (err) {
    console.error('Failed to load coverage:', err)
  } finally {
    loading.value = false
  }
})

function highlight(value) {
  const pct = parseFloat(value)
  if (pct === 100) return 'ok'
  if (pct >= 80) return 'warn'
  return 'fail'
}
</script>

<style scoped>
.coverage-table {
  width: 100%;
  border-collapse: collapse;
}
.coverage-table th,
.coverage-table td {
  padding: 0.5rem;
  text-align: center;
}
.ok { color: green; }
.warn { color: orange; }
.fail { color: red; }
</style>

<template>
  <v-switch
    v-model="showIncompleteOnly"
    label="Show only incomplete sets"
  />  
  <DashboardCard title="Set Coverage Overview">
    <v-data-table
      :items="filteredStats"
      :headers="headers"
      :loading="loading"
      :sort-by="['release_date']"
      sort-desc
      class="elevation-1"
      density="compact">
      <template #item.release_date="{ item }">
        {{ formatDate(item.release_date) }}
      </template>
    </v-data-table>
  </DashboardCard>
</template>

