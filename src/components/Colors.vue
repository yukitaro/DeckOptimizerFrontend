<script setup>
import { toRefs } from 'vue'

const props = defineProps({
  color_name: String
})
const { color_name } = toRefs(props)
</script>

<template>
  <img v-if="color_name === 'islands'" src="@/assets/islands.svg" />
  <img v-else-if="color_name === 'plains'" src="@/assets/plains.svg" />
  <img v-else-if="color_name === 'swamps'" src="@/assets/swamps.svg" />
  <img v-else-if="color_name === 'mountains'" src="@/assets/mountains.svg" />
  <img v-else-if="color_name === 'forests'" src="@/assets/forests.svg" />
  <img v-else src="@/assets/colorless.svg" />
</template>