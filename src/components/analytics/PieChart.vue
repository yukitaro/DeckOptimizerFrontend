<script setup>
import { Pie } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { computed } from 'vue'

ChartJS.register(Title, Tooltip, Legend, ArcElement)

const props = defineProps({
  data: {
    type: Array,
    required: true
  }
})

const chartData = computed(() => ({
  labels: props.data.map(d => d.label),
  datasets: [
    {
      data: props.data.map(d => d.value),
      backgroundColor: [
        '#4CAF50', '#FFC107', '#2196F3', '#9C27B0',
        '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'
      ]
    }
  ]
}))
</script>

<template>
  <Pie :data="chartData" />
</template>
