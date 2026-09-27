<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useSetData } from '@/composables/useMagicSetData'
const { loadSetData, setData } = useSetData();

const selectedSets = defineModel<any[]>({ default: () => []});
const setMTGSetsSearchText = ref('');
const selectedSetComboBox = ref(null);

function selectTopSet() {
  if (setMTGSetsSearchText.value && setMTGSetsSearchText.value.trim().length > 0) {
    const filtered = selectedSetComboBox.value?.filteredItems || []

    if (filtered.length > 0) {
      const topItem = filtered[0].raw ?? filtered[0]

      nextTick(() => {
        const cleanedList = selectedSets.value.filter(s => typeof s !== 'string')
        const exists = cleanedList.some(s => s.value === topItem.value)
        if (!exists) {
          cleanedList.push(topItem)
        }
        selectedSets.value = [...cleanedList]
        setMTGSetsSearchText.value = ''
      })
    }
    return
  }
}

onMounted(async () => {
  await loadSetData();
});
</script>
<template>
    <v-combobox
        ref="selectedSetComboBox"
        v-model="selectedSets"
        v-model:search="setMTGSetsSearchText"
        :items="setData"
        label="Magic Sets"
        placeholder="Select sets to search in..."
        variant="outlined"
        density="comfortable"
        multiple
        chips
        clearable
        @keydown.enter.prevent="selectTopSet"
    />
</template>