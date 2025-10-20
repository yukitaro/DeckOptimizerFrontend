<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchImportCandidates, fetchReadyCount, importCandidate } from '@/api/importCandidates';
import type { ImportCandidate as MtgJsonImportCandidate } from '@/utils/types';
import { format } from 'date-fns';

const candidates = ref(<MtgJsonImportCandidate[]>[]);
const readyCount = ref(0);
const today = new Date();

function isReady(set: MtgJsonImportCandidate): boolean {
  const release = new Date(set.release_date);
  const daysUntilRelease = (release.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilRelease <= 14 || release < today;
}

async function triggerImport(setCode: string) {
  await importCandidate(setCode);
  candidates.value = await fetchImportCandidates(); // refresh
}

const headers = [
  { title: 'Set Code', key: 'set_code' },
  { title: 'Set Name', key: 'set_name' },
  { title: 'Release Date', key: 'release_date' },
  { title: 'Total Cards', key: 'total_cards' },
  { title: 'Ready?', key: 'ready', sortable: false },
  { title: 'Action', key: 'action', sortable: false },
];

onMounted(async () => {
  candidates.value = await fetchImportCandidates();
  readyCount.value = await fetchReadyCount();
});
</script>

<template>
  <v-data-table
    :items="candidates"
    :headers="headers"
    :sort-by="['release_date']"
    sort-desc
    class="elevation-1 coverage-table"
    density="compact"
  >
    <template #item.release_date="{ item }">
      {{ format(new Date(item.release_date), 'yyyy-MM-dd') }}
    </template>

    <template #item.ready="{ item }">
      <v-chip :color="isReady(item) ? 'green' : 'grey'" dark>
        {{ isReady(item) ? 'Yes' : 'No' }}
      </v-chip>
    </template>

    <template #item.action="{ item }">
      <v-btn
        size="small"
        color="primary"
        :disabled="!isReady(item)"
        @click="triggerImport(item.set_code)"
      >
        Import
      </v-btn>
    </template>
  </v-data-table>
</template>