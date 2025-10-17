<script setup>
import { onMounted, ref } from 'vue'
import { fetchDataCoverage } from '@/api/dashboard'
import DashboardCard from './DashboardCard.vue'

const stats = ref([])
const loading = ref(true)

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
  <DashboardCard title="Set Coverage Overview">
    <table class="coverage-table">
      <thead>
        <tr>
          <th>Set</th>
          <th>Total</th>
          <th>Metadata %</th>
          <th>Normalized %</th>
          <th>Image %</th>
          <th>Missing Enrichment</th>
          <th>Logic Versions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading" v-for="n in 5" :key="n">
          <td><v-skeleton-loader type="text" width="60px" /></td>
          <td><v-skeleton-loader type="text" width="40px" /></td>
          <td><v-skeleton-loader type="text" width="50px" /></td>
          <td><v-skeleton-loader type="text" width="50px" /></td>
          <td><v-skeleton-loader type="text" width="50px" /></td>
          <td><v-skeleton-loader type="text" width="40px" /></td>
          <td><v-skeleton-loader type="text" width="30px" /></td>
        </tr>

        <tr v-else v-for="row in stats" :key="row.set_name">
          <td>{{ row.set_name }}</td>
          <td>{{ row.total_raw_cards }}</td>
          <td :class="highlight(row.metadata_pct)">{{ row.metadata_pct }}%</td>
          <td :class="highlight(row.normalization_pct)">{{ row.normalization_pct }}%</td>
          <td :class="highlight(row.image_pct)">{{ row.image_pct }}%</td>
          <td>{{ row.missing_enrichment_timestamp }}</td>
          <td>{{ row.logic_versions_used }}</td>
        </tr>
      </tbody>
    </table>
  </DashboardCard>
</template>

