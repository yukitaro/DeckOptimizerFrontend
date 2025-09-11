<script setup>
import { toRefs } from 'vue'

const props = defineProps({
  color_name: String,
  mana_cost: String
})
const { color_name } = toRefs(props)
const { mana_cost } = toRefs(props)
</script>

<template>
  <span class="mana-gap"><svg v-if="mana_cost !== undefined && mana_cost !== ''" width="26" height="26" viewBox="0 0 30 30">
    <!-- Light grey circle -->
    <circle cx="15" cy="15" r="14.5" fill="#e0e0e0" stroke="#ccc" stroke-width="2" />
    <!-- Mana cost text -->
    <text x="15" y="21" text-anchor="middle" font-size="18" fill="#333" font-family="gotham, Arial, sans-serif">
      {{ mana_cost }}
    </text>    
  </svg>
  </span>  
  <span v-if="color_name !== undefined && color_name !== ''" class="mana-gap">
  <img v-if="color_name === 'islands'" src="@/assets/islands.svg" />
  <img v-else-if="color_name === 'plains'" src="@/assets/plains.svg" />
  <img v-else-if="color_name === 'swamps'" src="@/assets/swamps.svg" />
  <img v-else-if="color_name === 'mountains'" src="@/assets/mountains.svg" />
  <img v-else-if="color_name === 'forests'" src="@/assets/forests.svg" />
  <img v-else src="@/assets/colorless.svg" />
  </span>
</template>

<style>
.mana-gap {
  margin-right: 2px;
  margin-left: 2px;
}
</style>