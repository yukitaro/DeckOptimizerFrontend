<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useSiteWideRouter } from '@/composables/useSitewideRouter'
import type { Card } from '@/utils/types'
import { addMTGCardToDynamicList } from '@/api/listClient'

const { xs, mobile } = useDisplay()

const props = withDefaults(
  defineProps<{
    card: Card
    mode?: 'market' | 'collection'
    viewMode?: 'grid' | 'list'
    imageSize?: 'sm' | 'md' | 'lg'
    dynamicListName?: string
  }>(),
  {
    mode: 'market',
    viewMode: 'grid',
    imageSize: 'md',
    dynamicListName: ''
  }
)

const sizeMap = {
  sm: 120,
  md: 200,
  lg: 300
}

const { routeToCardMetadata } = useSiteWideRouter()

function addToDynamicList(card: Card, listName: string | undefined, isFoil: boolean) {
  if (listName) {
    addMTGCardToDynamicList(card, listName, isFoil)
  }
}

// Deep resolve prices across all possible nested shapes
const prices = computed(() => {
  let raw = 
    props.card.prices ?? 
    props.card.card_metadata?.prices ?? 
    props.card.card_from_set?.card_metadata?.prices ?? 
    props.card.card_from_set?.prices

  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { raw = null }
  }
  return raw || {}
})

// Finish availability detection
const hasFoil = computed(() => {
  return Boolean(
    props.card.has_foil ?? 
    props.card.card_metadata?.has_foil ?? 
    props.card.card_from_set?.card_metadata?.has_foil ?? 
    props.card.card_from_set?.has_foil ??
    prices.value?.usd_foil
  )
})

const hasNonfoil = computed(() => {
  return Boolean(
    props.card.has_nonfoil ?? 
    props.card.card_metadata?.has_nonfoil ?? 
    props.card.card_from_set?.card_metadata?.has_nonfoil ?? 
    props.card.card_from_set?.has_nonfoil ??
    prices.value?.usd
  )
})

// Collection single variant info
const collectionVariant = computed(() => {
  const cardPrices = prices.value
  const isFoil = Boolean(props.card.is_foil)
  const priceVal = isFoil ? cardPrices?.usd_foil : cardPrices?.usd

  return {
    isFoil,
    priceFormatted: priceVal ? `$${priceVal}` : 'N/A',
    icon: isFoil ? '✨' : null
  }
})

// Market variants list
const variantPricing = computed(() => {
  const items = []
  const cardPrices = prices.value

  const canFoil = Boolean(cardPrices?.usd_foil) || hasFoil.value
  const canNonfoil = Boolean(cardPrices?.usd) || (hasNonfoil.value && !cardPrices?.usd_foil)
  const isBoth = canFoil && canNonfoil

  if (canNonfoil) {
    items.push({
      type: 'nonfoil',
      labelText: isBoth ? 'Normal' : 'Add',
      isFoil: false,
      priceFormatted: cardPrices?.usd ? `$${cardPrices.usd}` : 'N/A',
      icon: null
    })
  }

  if (canFoil) {
    items.push({
      type: 'foil',
      labelText: isBoth ? 'Foil' : 'Add Foil',
      isFoil: true,
      priceFormatted: cardPrices?.usd_foil ? `$${cardPrices.usd_foil}` : 'N/A',
      icon: '✨'
    })
  }

  if (items.length === 0) {
    items.push({
      type: 'nonfoil',
      labelText: 'Add',
      isFoil: false,
      priceFormatted: 'N/A',
      icon: null
    })
  }

  return items
})
</script>

<template>
  <div v-if="viewMode === 'grid'" class="card-grid-item">
    <!-- Card stretches to 100% of its grid slot -->
    <v-card 
      variant="outlined" 
      class="mx-auto w-100 card-box"
    >
      <v-img
        @click="routeToCardMetadata(card)"
        :src="card.image_url || card.card_from_set?.image_url || 'https://via.placeholder.com/200x280'"
        width="100%"
        aspect-ratio="0.714"
        cover
        class="cursor-pointer"
      />
      
      <!-- Adjust padding based on imageSize on desktop -->
      <v-card-text :class="['pa-1', imageSize === 'lg' ? 'pa-sm-3' : 'pa-sm-1']">
        <!-- Title & Count -->
        <div class="d-flex align-center justify-space-between mb-1">
          <p :class="[
            'font-weight-bold text-truncate mb-0',
            imageSize === 'sm' ? 'text-caption' : 'text-caption text-sm-body-2'
          ]">
            {{ card.name || card.card_from_set?.name }}
          </p>
          <v-chip 
            :size="imageSize === 'sm' ? 'x-small' : 'small'" 
            color="primary" 
            class="ml-1 font-weight-bold px-1 count-chip"
          >
            {{ card.card_count ?? card.copies_owned ?? 1 }}
          </v-chip>
        </div>

        <!-- COLLECTION MODE LAYOUT -->
        <div v-if="mode === 'collection'" class="d-flex align-center justify-space-between">
          <p 
            class="text-caption text-medium-emphasis text-truncate mb-0 d-none d-sm-block"
            v-if="imageSize !== 'sm'"
          >
            {{ card.set_name || card.card_from_set?.set_name }}
          </p>

          <span :class="['price-text', collectionVariant.isFoil ? 'text-amber-accent-4 font-weight-bold' : 'text-high-emphasis']">
            <span v-if="collectionVariant.icon">{{ collectionVariant.icon }} </span>
            {{ collectionVariant.priceFormatted }}
          </span>
        </div>

        <!-- MARKET MODE LAYOUT -->
        <template v-else>
          <p 
            class="text-caption text-medium-emphasis text-truncate mb-2 d-none d-sm-block"
            v-if="imageSize !== 'sm'"
          >
            {{ card.set_name || card.card_from_set?.set_name }}
          </p>

          <div class="d-flex flex-column ga-1 pt-1 border-t">
            <div 
              v-for="variant in variantPricing" 
              :key="variant.type"
              class="d-flex align-center justify-space-between py-1 line-row"
            >
              <span :class="['price-text', variant.isFoil ? 'text-amber-accent-4 font-weight-bold' : 'text-high-emphasis']">
                <span v-if="variant.icon">{{ variant.icon }} </span>
                {{ variant.priceFormatted }}
              </span>

              <v-btn
                size="x-small"
                variant="tonal"
                color="primary"
                class="px-1 custom-add-btn"
                v-if="dynamicListName && dynamicListName.length > 0" 
                @click.stop="addToDynamicList(card, dynamicListName, variant.isFoil)"
              >
                <v-icon size="12">mdi-plus</v-icon>
                <span class="d-none d-sm-inline ml-1" v-if="imageSize !== 'sm'">{{ variant.labelText }}</span>
              </v-btn>
            </div>
          </div>
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.card-grid-item {
  width: 100%;
  min-width: 0;
}

.card-box {
  width: 100% !important;
  max-width: 100% !important;
}

.count-chip {
  height: 16px !important;
  font-size: 10px !important;
}

.price-text {
  font-size: 0.75rem;
  line-height: 1.1;
}

@media (min-width: 600px) {
  .price-text {
    font-size: 0.8125rem;
  }
}
</style>