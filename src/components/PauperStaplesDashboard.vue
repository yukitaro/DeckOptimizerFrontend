<script setup lang="ts">
import { getTopPauperStaples } from '@/api/analyticsClient'
import { computed, onMounted, ref, watch} from 'vue'
import type { Card, NormalizedForPauper } from '@/utils/types'
import { Colors } from '@/interfaces'
import { getColorManaCost, getNumericalManaCost, mapColorCodeToName} from '../utils/deckUtils'
import SetComboBox from '@/components/widgets/SetComboBox.vue'
import { useSiteWideRouter } from '@/composables/useSitewideRouter';

const topPauperStaplesRaw = ref<[]>([])
const selectedSets = ref<any[]>([])
const exclusiveToSet = ref(false)
const sideBoardThreshold = ref(40)
const filterCardName = ref('')
const includedDecksThreshold = ref(4)
const ownedThreshold = ref('')
const { routeToCardMetadata } = useSiteWideRouter()

const mtgCardTypes = [
  { id: 'Creature', value: 'Creature', label: 'Creature' },
  { id: 'Artifact', value: 'Artifact', label: 'Artifact' },
  { id: 'Instant', value: 'Instant', label: 'Instant' },
  { id: 'Sorcery', value: 'Sorcery', label: 'Sorcery' },
  { id: 'Enchantment', value: 'Enchantment', label: 'Enchantment' },
  { id: 'Land', value: 'Land', label: 'Land' }
];

const mtgCardTypesSelected = ref<string[]>(
  mtgCardTypes
    .filter(t => t.value !== 'Land')
    .map(t => t.value)
)

async function fetchStaples() {
  const setValues = selectedSets.value.map(s =>
    typeof s === 'string' ? s : (s.value ?? s)
  )

  topPauperStaplesRaw.value = await getTopPauperStaples(
    [],
    setValues,
    exclusiveToSet.value,
    mtgCardTypesSelected.value,
    ownedThreshold.value // <-- 5th argument passed to client!
  )
}

watch([selectedSets, exclusiveToSet], fetchStaples)
watch(mtgCardTypesSelected, fetchStaples, { deep: true })

const topPauperStaples = computed<NormalizedForPauper[]>(() => {
  const staples = topPauperStaplesRaw.value?.data?.pauper_staples || []
  return staples.flatMap((item: any) => {
    const ratio = item.sideboard_ratio ?? 0

    if (item.number_of_decks < includedDecksThreshold.value) {
      return []
    }

    if (ratio > sideBoardThreshold.value) {
      return []
    }

    return [{
      id: item.card_data_normalized_id,
      name: item.name,
      mana_cost: item.mana_cost,
      mana_numeric: getNumericalManaCost(item.mana_cost),
      mana_colors: getColorManaCost(item.mana_cost),
      slug: item.slug,
      canonical_printing: item.canonical_printing,
      canonical_printing_id: item.canonical_printing_id,
      total_count: item.total_count,
      number_of_decks: item.number_of_decks,
      average_num_in_decks: item.average_num_in_decks,
      deck_inclusion_rate: item.deck_inclusion_rate,
      total_owned: item.total_owned,
      needed_for_playset: item.needed_for_playset,
      lowest_price: item.lowest_price,
      lowest_price_set:  item.lowest_price_set,
      tcg_player_url: item.tcg_link
    }]
  })
})

const allHeaders = ref([
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Mana Cost', key: 'mana_cost', value: 'mana_cost', width: '200px' },
  { title: 'Total Count', key: 'total_count', sortable: true },
  { title: 'Number of Decks', key: 'number_of_decks', sortable: true },
  { title: 'Average Num in Decks', key: 'average_num_in_decks', sortable: true },
  { title: 'Deck Inclusion Rate', key: 'deck_inclusion_rate', sortable: true },
  { title: 'Total Owned', key: 'total_owned', sortable: true },
  { title: 'Needed for Playset', key: 'needed_for_playset', sortable: true },
  { title: 'Price', key: 'lowest_price', sortable: true },
  { title: 'TCG Purchase URL', key: 'tcg_player_url', sortable: false },
])

function handleCardClick(item: NormalizedForPauper) {
  const printing = item.canonical_printing || {}

  // Construct expected Card structure on the fly
  const cardPayload = {
    card_from_set: {
      id: item.id,
      slug: item.slug,
      set_name: item.canonical_printing || item.lowest_price_set,
      number_in_set: item.canonical_printing_id,
    }
  } as Card

  routeToCardMetadata(cardPayload, { returnToLocation: '/adminconsole/pauper-staples' })
}

onMounted(async () => {
  // What to do about archetypes..
  // const archetypes = await getKnownArchetypes() 
  // topPauperStaplesRaw.value = await getTopPauperStaples([], [], false, mtgCardTypesSelected.value, ownedThreshold.value)
  await fetchStaples()
})
</script>
<template>
  <v-container>
    <h1 class="text-h5 font-weight-bold mb-4">Pauper Staples Dashboard</h1>
    <div class="filters-row">
    <!-- Card Types -->
    <div class="types-group">
      <span class="filter-label">Card Types:</span>
      <div class="checkbox-row">
        <div v-for="item in mtgCardTypes" :key="item.id" class="checkbox-item">
          <input
            type="checkbox"
            :id="item.id"
            :value="item.value"
            v-model="mtgCardTypesSelected"
          />
          <label :for="item.id">{{ item.label }}</label>
        </div>
      </div>
    </div>

    <!-- Exclusive Checkbox -->
    <div class="exclusive-group">
      <v-checkbox
        label="Exclusive to Set"
        v-model="exclusiveToSet"
        density="compact"
        hide-details
      />
    </div>
    <div class="types-group">
      <span class="filter-label">Show sideboard:</span>
      <v-text-field
        type="number"
        label="Sideboard Threshold"
        v-model="sideBoardThreshold"
        density="compact"
        hide-details
      />
    </div>
    <div class="types-group">
      <span class="filter-label">Included Decks:</span>
      <v-text-field
        type="number"
        label="Included Decks Threshold"
        v-model="includedDecksThreshold"
        density="compact"
        hide-details
      />
    </div>
    <div class="types-group">
      <span class="filter-label">Owned:</span>
      <v-text-field
        type="text"
        label="Owned Threshold"
        v-model="ownedThreshold"
        density="compact"
        hide-details
        clearable
        @keydown.enter="fetchStaples"
        @click:clear="fetchStaples"
        @blur="fetchStaples"
      />
    </div>
  </div>

  <!-- Magic Sets -->
   <v-row>
      <v-col cols="12" sm="6" md="4">
        <div class="set-combobox">
          <SetComboBox v-model="selectedSets" />
        </div>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <div>
          <v-text-field
            type="string"
            label="Filter by Card Name"
            v-model="filterCardName"
            density="compact"
            hide-details
          />
        </div>
      </v-col>
    </v-row>

    <v-card>
      <v-card-title>Pauper Staples stuff</v-card-title>
      <v-data-table
        :items="topPauperStaples"
        :headers="allHeaders"
        :search="filterCardName"
        >
        <template v-slot:item.name="{ item }">
          <span>
            <a href="#" @click.prevent="handleCardClick(item)">{{ item.name }}</a>
          </span>
        </template>
        <template v-slot:item.mana_cost="{ item }">
          <div class="mana-cost-display d-flex align-center">
            <span class="mr-1 d-inline-flex">
              <Colors :mana_cost="item.mana_numeric" />
            </span>
            <span
              v-for="(c, idx) in item.mana_colors"
              :key="idx"
              class="color-symbol mr-1"
            >
              <Colors :color_name="mapColorCodeToName(c)" />
            </span>
          </div>
        </template>        
        <template v-slot:item.lowest_price="{ item }">
          <span>
            ${{ item.lowest_price ?? '' }}
          </span>
        </template>
        <template v-slot:item.tcg_player_url="{ item }">
          <span>
            <a :href="item.tcg_player_url" target="_blank">Link</a>
          </span>
        </template>
        
      </v-data-table>
    </v-card>
  </v-container>
</template>
<style>
.filters-row {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.types-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-weight: 600;
  margin-right: 4px;
}

.checkbox-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.exclusive-group {
  display: flex;
  align-items: center;
}
</style>