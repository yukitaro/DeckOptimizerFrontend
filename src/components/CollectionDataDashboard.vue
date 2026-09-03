<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

import { retrieveCollections } from '@/api/collection'

import ValueSummary from '@/components/analytics/ValueSummary.vue'
import PieChart from '@/components/analytics/PieChart.vue'
import BarChart from '@/components/analytics/BarChart.vue'
import ChartCard from '@/components/analytics/ChartCard.vue'

// Import your API client functions
import {
  getCollectionSummary,
  getSetBreakdown,
  getRarityBreakdown,
  getFoilBreakdown,
  getTopCards,
  getColorIdentityBreakdown
} from '@/api/analyticsClient'

const listOfCollections = ref([])
const selectedCollectionId = ref(null)

async function fetchCollections() {
  const response = await retrieveCollections()
  listOfCollections.value = response.data
}

const route = useRoute()
const collectionId = Number(route.params.id)

// Reactive state
const summary = ref(null)
const sets = ref([])
const rarity = ref([])
const foil = ref([])
const topCards = ref([])
const colors = ref([])

async function loadAnalytics() {
  if (!selectedCollectionId.value) return

  summary.value = (await getCollectionSummary(selectedCollectionId.value)).data
  sets.value = (await getSetBreakdown(selectedCollectionId.value)).data
  rarity.value = (await getRarityBreakdown(selectedCollectionId.value)).data
  foil.value = (await getFoilBreakdown(selectedCollectionId.value)).data
  topCards.value = (await getTopCards(selectedCollectionId.value)).data
  colors.value = (await getColorIdentityBreakdown(selectedCollectionId.value)).data
}

onMounted(fetchCollections)

// Chart data transforms
const setsPieData = computed(() =>
  sets.value.map(s => ({
    label: s.set_name,
    value: s.market_total
  }))
)

const rarityPieData = computed(() =>
  rarity.value.map(r => ({
    label: r.rarity,
    value: r.market_total
  }))
)

const foilPieData = computed(() =>
  foil.value.map(f => ({
    label: f.is_foil ? 'Foil' : 'Non-Foil',
    value: f.market_total
  }))
)

const colorsPieData = computed(() =>
  colors.value.map(c => ({
    label: c.color_identities || 'Colorless',
    value: c.market_total
  }))
)

const topCardsBarData = computed(() => ({
  labels: topCards.value.map(c => c.card_name),
  values: topCards.value.map(c => c.market_total)
}))
</script>

<template>
<v-select
  v-model="selectedCollectionId"
  :items="listOfCollections"
  item-title="name"
  item-value="id"
  label="Select a Collection"
  class="mb-6"
  @update:modelValue="loadAnalytics"
/>
  <v-container fluid class="pa-6">
    <v-row>
      <v-col cols="12">
        <ValueSummary :data="summary" />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <ChartCard title="Value by Set" v-if="sets.length">
              <PieChart :data="setsPieData" />
        </ChartCard>
      </v-col>

      <v-col cols="12" md="6">
        <ChartCard title="Rarity Breakdown" v-if="rarity.length">
          <PieChart :data="rarityPieData" />
        </ChartCard>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <ChartCard title="Foil vs Non-Foil" v-if="foil.length">
          <PieChart :data="foilPieData" />
        </ChartCard>
      </v-col>

      <v-col cols="12" md="6">
        <ChartCard title="Color Identity Breakdown" v-if="colors.length">
          <PieChart :data="colorsPieData" />
        </ChartCard>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <ChartCard title="Top 20 Most Valuable Cards">
          <BarChart :data="topCardsBarData" />
        </ChartCard>
      </v-col>
    </v-row>
  </v-container>
</template>