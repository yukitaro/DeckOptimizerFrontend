<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Colors from './Colors.vue'

const props = defineProps<{
  filteredCardData: any[]
  activeColors: string[]
  globalColorCounts: Record<string, number>
}>()

const emit = defineEmits<{
  (e: 'update:activeColors', value: string[]): void
}>()

const colorMap = {
  W: 'plains',
  U: 'islands',
  B: 'swamps',
  R: 'mountains',
  G: 'forests',
  C: 'colorless'
}

const colorCodes = Object.keys(colorMap)

const toggles = ref<Record<string, boolean>>({ W: false, U: false, B: false, R: false, G: false, C: false })

watch(() => props.activeColors, (newVal) => {
  for (const code of colorCodes) {
    toggles.value[code] = newVal.includes(code)
  }
}, { immediate: true })

function toggleColor(code: string) {
  toggles.value[code] = !toggles.value[code]
  const updated = colorCodes.filter(c => toggles.value[c])
  emit('update:activeColors', updated)
}

const colorCounts = computed(() => {
  const counts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }

  for (const card of props.filteredCardData) {
    const raw = card.card_from_set?.colorIdentities || ''
    const codes = typeof raw === 'string' ? raw.split('') : Array.isArray(raw) ? raw : []

    for (const code of codes) {
      if (counts[code] !== undefined) {
        counts[code]++
      }
    }

    // Handle colorless explicitly
    if (codes.length === 0 || codes.includes('C')) {
      counts['C']++
    }
  }

  return counts
})
</script>

<template>
  <div class="color-filter-chips">
    <v-btn v-for="code in colorCodes" :key="code" :variant="toggles[code] ? 'elevated' : 'outlined'"
        :color="toggles[code] ? 'primary' : 'default'" class="ma-1" @click="toggleColor(code)">
        <v-badge :content="globalColorCounts[code]" color="success" floating>
            <template #default>
            <Colors :color_name="colorMap[code]" />
            </template>
        </v-badge>
    </v-btn>
  </div>
</template>
