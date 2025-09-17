<script setup lang=ts>
import type { ComparisonItem } from '@/utils/types'
import { toRefs } from 'vue'
import { getColorManaCost, getNumericalManaCost, mapColorCodeToName} from '@/utils/deckUtils'

const props = defineProps<{
  card: ComparisonItem
  count: number | string
}>()
const { card } = toRefs(props)
const { count } = toRefs(props)
//const { mana_cost } = toRefs(props)
</script>

<template>
<div class="card-row">
  <div class="card-name-left">{{ card.name }}</div>
  <div class="card-mana-right">
    <Colors :mana_cost="getNumericalManaCost(card.mana_cost ?? '')" size="18" />
    <span
      v-for="color in getColorManaCost(card.mana_cost ?? '')"
      :key="color"
      class="color-symbol"
    >
      <Colors :color_name="mapColorCodeToName(color)" size="18" />
    </span>
  </div>
</div>
</template>