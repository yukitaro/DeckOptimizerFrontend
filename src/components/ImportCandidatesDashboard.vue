<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchImportCandidates, fetchReadyCount, importCandidate } from '@/api/importCandidates';
import type { ImportCandidate as MtgJsonImportCandidate } from '@/utils/types';

const candidates = ref(<MtgJsonImportCandidate[]>[]);
const readyCount = ref(0);

async function triggerImport(setCode: string) {
  await importCandidate(setCode);
  candidates.value = await fetchImportCandidates(); // refresh
}

onMounted(async() => {
    candidates.value = await fetchImportCandidates();
    readyCount.value = await fetchReadyCount();
})
</script>

<template>
    <v-data-table
      :items="candidates"
      :sort-by="['release_date']"
      sort-desc
      class="elevation-1 coverage-table"
      density="compact"></v-data-table>
</template>