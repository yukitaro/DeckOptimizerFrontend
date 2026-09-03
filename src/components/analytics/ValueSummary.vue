<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

const profitClass = computed(() =>
  props.data.profit_loss >= 0 ? 'text-success' : 'text-error'
)
</script>

<template>
  <v-card class="pa-4" v-if="data">
    <v-card-title>Collection Value Summary</v-card-title>
    <v-card-text>
      <div class="d-flex justify-space-between">
        <div>
          <h3>${{ data.purchase_total.toFixed(2) }}</h3>
          <p>Purchase Total</p>
        </div>
        <div>
          <h3>${{ data.market_total.toFixed(2) }}</h3>
          <p>Market Total</p>
        </div>
        <div>
          <h3 :class="profitClass">
            ${{ data.profit_loss.toFixed(2) }}
          </h3>
          <p>Profit / Loss</p>
        </div>
      </div>
    </v-card-text>
  </v-card>

  <!-- Optional loading state -->
  <v-card v-else class="pa-4">
    <v-card-title>Loading...</v-card-title>
  </v-card>
</template>