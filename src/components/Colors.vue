<script setup>
import { toRefs } from 'vue'
import ForestsIcon from '@/components/icons/ForestsIcon.vue'
import IslandsIcon from '@/components/icons/IslandsIcon.vue'
import MountainsIcon from '@/components/icons/MountainsIcon.vue'
import PlainsIcon from '@/components/icons/PlainsIcon.vue'
import SwampsIcon from '@/components/icons/SwampsIcon.vue'
import ColorlessIcon from './icons/ColorlessIcon.vue'

const props = defineProps({
  color_name: String,
  mana_cost: String,
  size: {
    type: [String, Number],
    default: 25
  }
})
const { color_name } = toRefs(props)
const { mana_cost } = toRefs(props)

const iconMap = {
  islands: IslandsIcon,
  plains: PlainsIcon,
  swamps: SwampsIcon,
  mountains: MountainsIcon,
  forests: ForestsIcon,
  colorless: ColorlessIcon
}
</script>

<template>
<span class="mana-gap" v-if="mana_cost !== undefined && mana_cost !== ''">
  <svg :width="size" :height="size" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="13" fill="#e0e0e0" stroke="#ccc" stroke-width="2" />
    <text
      x="15"
      y="15"
      dy="0.35em"
      text-anchor="middle"
      font-size="16"
      fill="#333"
      font-family="gotham, Arial, sans-serif">
      {{ mana_cost }}
    </text>
  </svg>
</span>
  <span v-if="color_name !== undefined && color_name !== ''" class="mana-gap">
    <component
      :is="iconMap[color_name] || null"
      v-if="iconMap[color_name]"
      :size="size"
    />
  </span>
</template>

<style>
.mana-gap {
  margin-right: 1px;
  margin-left: 1px;
}
</style>