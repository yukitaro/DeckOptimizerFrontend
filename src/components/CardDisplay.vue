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
</script>

<template>
  <div v-if="viewMode === 'grid'" class="card-grid-item">
    <v-card variant="outlined">
        <v-img
        @click="routeToCardMetadata(card)"
        :src="card.card_from_set?.image_url || card.image_url || 'https://via.placeholder.com/200x280'"
        :alt="card.card_from_set?.name || card.name || 'Card'"
        :max-width="sizeMap[imageSize || 'md']"
        aspect-ratio="5/7"
        />
        <v-card-text class="pa-2">
        <p class="text-body-2 font-weight-bold">
            {{ card.card_from_set?.name || card.name || 'Unknown Card' }}
            <v-chip size="x-small" color="primary">{{ card.card_count }}</v-chip>
        </p>
        <p class="text-caption text-medium-emphasis">
            {{ card.card_from_set?.set_name || card.set_name || 'Unknown Set' }}
        </p>
        <p v-if="card.is_foil" class="text-caption text-warning">
            ✨ {{ card.card_from_set?.card_metadata?.prices?.usd_foil ? `Foil Price: $${card.card_from_set.card_metadata.prices.usd_foil}` : 'Foil Price: N/A' }}
        </p>
        <p v-else>
          {{ card.card_from_set?.card_metadata?.prices?.usd ? `Price: $${card.card_from_set.card_metadata.prices.usd}` : 'Price: N/A' }}
        </p>
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
