<script setup>
import { ref, onMounted } from 'vue'

const coverage = ref([])
const loading = ref(true)
const base_url = "http://localhost:80";

const headers = [
  { title: 'Set Name', key: 'set_name' },
  { title: 'Total Cards', key: 'total' },
  { title: 'With Image', key: 'with_image' },
  { title: 'Missing', key: 'missing' },
  { title: 'Coverage %', key: 'coverage_percent' }
]

onMounted(async () => {
  try {
    const response = await fetch(`${base_url}/api/dashboard/image-coverage`)
    const data = await response.json()
    coverage.value = data.filter(row => { return row.coverage_percent < 100 && row.missing > 30})
  } catch (error) {
    console.error('Failed to fetch image coverage:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <v-container>
    <h1 class="text-h5 font-weight-bold mb-4">Admin Console</h1>

    <v-card>
      <v-card-title>Image Coverage by Set</v-card-title>
      <v-card-text>
        <v-data-table
          :items="coverage"
          :headers="headers"
          :loading="loading"
          class="elevation-1"
          density="compact"
          :sort-by="['missing']"
          sort-desc
        >
          <template #item.coverage_percent="{ item }">
            {{ item.coverage_percent }}%
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>