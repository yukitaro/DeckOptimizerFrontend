<script setup lang="ts">
import { Colors } from '@/interfaces'
import { useSiteWideRouter } from '@/composables/useSitewideRouter'
import type { Card } from '@/utils/types'

const { routeToCardMetadata } = useSiteWideRouter()

const props = defineProps<{
  card: Card
  viewMode?: 'grid' | 'list'
  imageSize?: 'sm' | 'md' | 'lg'
}>()

const sizeMap = {
  sm: 120,
  md: 200,
  lg: 300
}

function getPrice(card: Card) {

  if (card.price_usd) {
    return `$${card.price_usd}`
  }
  
  const price = card.is_foil
    ? card.card_from_set?.card_metadata?.prices?.usd_foil
    : card.card_from_set?.card_metadata?.prices?.usd

  return price ? `$${price}` : 'N/A'
}

function getPriceChangeDetails(card: Card): { formatted: string; color: string } | null {
  const purchasePrice = Number(card.purchase_price)
  
  // Safely parse current price
  const rawCurrentPrice = card.is_foil
    ? card.card_from_set?.card_metadata?.prices?.usd_foil
    : card.card_from_set?.card_metadata?.prices?.usd
  const currentPrice = rawCurrentPrice ? Number(rawCurrentPrice) : null

  // Require valid numbers for both prices
  if (purchasePrice === null || currentPrice === null || isNaN(purchasePrice) || isNaN(currentPrice)) {
    return null
  }

  // Handle zero purchase price (Infinity)
  if (purchasePrice === 0) {
    if (currentPrice > 0) {
      return { formatted: '+∞%', color: 'success' }
    } else if (currentPrice === 0) {
      return { formatted: '0.00%', color: 'success' }
    }
  }

  // Standard percentage change calculation: ((current - purchase) / purchase) * 100
  const percentage = ((currentPrice - purchasePrice) / purchasePrice) * 100
  const formattedValue = `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
  const color = percentage >= 0 ? 'success' : 'error'

  return {
    formatted: formattedValue,
    color
  }
}
</script>

<template>
  <div v-if="viewMode === 'grid'" class="card-grid-item">
    <v-card variant="outlined":style="{ width: `${sizeMap[imageSize || 'md']}px` }" class="mx-auto">
        <v-img
        @click="routeToCardMetadata(card)"
        :src="card.card_from_set?.image_url || card.image_url || 'https://via.placeholder.com/200x280'"
        :alt="card.card_from_set?.name || card.name || 'Card'"
        width="100%"
        aspect-ratio="0.714"
        cover
        class="cursor-pointer"
        />
        <v-card-text class="pa-2">
        <p class="text-body-2 font-weight-bold">
            {{ card.card_from_set?.name || card.name || 'Unknown Card' }}
            <v-chip size="x-small" color="primary">{{ card.card_count }}</v-chip>
        </p>
        <p class="text-caption text-medium-emphasis">
            {{ card.card_from_set?.set_name || card.set_name || 'Unknown Set' }}
        </p>
        <!-- Price & Percentage Display -->
        <div class="d-flex align-center ga-1 text-caption">
          <span v-if="card.is_foil" class="text-warning font-weight-bold">
            ✨ {{ card.card_from_set?.card_metadata?.prices?.usd_foil ? `$${card.card_from_set.card_metadata.prices.usd_foil}` : 'N/A' }}
          </span>
          <span v-else>
            {{ getPrice(card) }}
          </span>

          <!-- Price Change Chip -->
          <v-chip
            v-if="getPriceChangeDetails(card)"
            size="x-small"
            :color="getPriceChangeDetails(card)?.color"
            variant="tonal"
            class="font-weight-bold ml-auto"
          >
            {{ getPriceChangeDetails(card)?.formatted }}
          </v-chip>
        </div>
        </v-card-text>
    </v-card>
  </div>

  <div v-else class="card-list-item">
    <p @click="routeToCardMetadata(card)">
      <strong>{{ card.card_count }}x</strong>
      {{ card.card_from_set?.name }}
      — {{ card.card_from_set?.type }}
    </p>
  </div>
</template>
