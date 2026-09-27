<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useSiteWideRouter } from '@/composables/useSitewideRouter'
import type { Card } from '@/utils/types'
import { addMTGCardToDynamicList } from '@/api/listClient'
import { symbol_api as baseSymbolUrl } from '@/api/client'

const symbolBaseUrl = baseSymbolUrl
const setSymbolUrl = (set_name: string) =>
  `${symbolBaseUrl}/set-symbols/${set_name}.png`
const failedImages = new Set() // track failed images

const { xs, mobile } = useDisplay()

const props = withDefaults(
  defineProps<{
    card: Card
    mode?: 'market' | 'collection'
    viewMode?: 'grid' | 'list'
    imageSize?: 'sm' | 'md' | 'lg'
    dynamicListName?: string
    returnToLocation?: string
  }>(),
  {
    mode: 'market',
    viewMode: 'grid',
    imageSize: 'md',
    dynamicListName: '',
    returnToLocation: ''
  }
)

const emit = defineEmits<{
  (e: 'edit', card: Card): void
}>()

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

const setNameOfCard = computed(() => {
  return (
    props.card.set_name ||
    props.card.card_from_set?.set_name ||
    null
  )
})

const cardRarity = computed(() => {
  const raw = (
    props.card.rarity ||
    props.card.card_from_set?.rarity ||
    'common'
  ).toLowerCase()

  if (raw.includes('mythic')) return 'mythic'
  if (raw.includes('rare')) return 'rare'
  if (raw.includes('uncommon')) return 'uncommon'
  return 'common'
})

const rarityClass = computed(() => `rarity-symbol-${cardRarity.value}`)

// Collection single variant info
const collectionVariant = computed(() => {
  const rawAttributes = props.card.normalized_attributes || {}
  const attributes = typeof rawAttributes === 'string' ? JSON.parse(rawAttributes) : rawAttributes
  const cardFinishes = attributes['finishes'] || []
  const isFoil = Boolean(cardFinishes.includes('foil') || cardFinishes.includes('etched'))
  const priceVal = props.card.card_from_set.card_metadata.variant_prices[0]?.price ?? null

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

const onImageError = (e: Event, code: string) => {
  if (!failedImages.has(code)) {
    failedImages.add(code)
    ;(e.target as HTMLImageElement).src = `${symbolBaseUrl}/unknown-set.png`
  }
}
</script>

<template>
  <div v-if="viewMode === 'grid'" class="card-grid-item">
    <!-- Card stretches to 100% of its grid slot -->
    <v-card 
      variant="outlined" 
      class="mx-auto w-100 card-box"
    >
      <div class="position-relative overflow-hidden card-image-wrapper">
        <v-img
          @click="routeToCardMetadata(card, { returnToLocation: props.returnToLocation })"
          :src="card.image_url || card.card_from_set?.image_url || 'https://via.placeholder.com/200x280'"
          width="100%"
          aspect-ratio="0.714"
          cover
          class="cursor-pointer"
        />

        <v-btn
          v-if="mode === 'collection'"
          icon="mdi-pencil"
          size="x-small"
          color="surface"
          variant="flat"
          class="edit-hover-btn"
          density="comfortable"
          @click.stop="emit('edit', card)"
        />
      </div>
      
      <!-- Adjust padding based on imageSize on desktop -->
      <v-card-text :class="['pa-1', imageSize === 'lg' ? 'pa-sm-3' : 'pa-sm-1']">
        <!-- Title & Count -->
        <div class="d-flex align-center mb-1">
          <img
            :src="setSymbolUrl(setNameOfCard)"
            :alt="`${setNameOfCard} Symbol`"
            :key="failedImages.has(setNameOfCard) ? `${setNameOfCard}-fallback` : setNameOfCard"
            :class="['set-symbol-img', rarityClass, 'mr-2']"
            loading="lazy"
            @error="onImageError($event, setNameOfCard)"
          />
          <p :class="[
            'font-weight-bold text-truncate mb-0 flex-grow-1',
            imageSize === 'sm' ? 'text-caption' : 'text-caption text-sm-body-2'
          ]">
            {{ card.name || card.card_from_set?.name }}
          </p>
          <v-chip v-if="card.copies_owned && card.copies_owned > 0 || card.card_count && card.card_count > 0"
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
            {{ card.set_name || card.card_from_set?.set_name }} <span v-if="card.language==='ja'">(日)</span>
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

/* Position edit button in upper right with translucent background */
.edit-hover-btn {
  position: absolute !important;
  top: 6px;
  right: 6px;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s ease-in-out, transform 0.15s ease-in-out;
  background-color: rgba(15, 23, 42, 0.65) !important; /* Semi-transparent dark slate */
  color: #ffffff !important;
  backdrop-filter: blur(4px);
}

/* Reveal button when hovering specifically over the card image wrapper */
.card-image-wrapper:hover .edit-hover-btn {
  opacity: 1;
}

/* Touch devices (mobile) always show button since hover isn't natural */
@media (hover: none) {
  .edit-hover-btn {
    opacity: 0.85;
  }
}

.set-symbol-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
  transition: transform 0.2s ease;
  display: inline-block;
  vertical-align: middle;
  /* Prevent background/bounding box fill during image swaps */
  background-color: transparent;
  flex-shrink: 0;
}

/* Common: Dark Charcoal */
.rarity-symbol-common {
  filter: brightness(0) saturate(100%) invert(18%) sepia(18%) saturate(1420%) hue-rotate(182deg) brightness(96%) contrast(92%);
}

/* Uncommon: Bright Silver Sheen */
.rarity-symbol-uncommon {
  filter: brightness(0) saturate(100%) invert(70%) sepia(11%) saturate(548%) hue-rotate(178deg) brightness(101%) contrast(93%);
}

/* Rare: MTG Gold */
.rarity-symbol-rare {
  filter: brightness(0) saturate(100%) invert(77%) sepia(85%) saturate(1212%) hue-rotate(358deg) brightness(98%) contrast(92%);
}

/* Mythic: Orange / Fiery Red */
.rarity-symbol-mythic {
  filter: brightness(0) saturate(100%) invert(38%) sepia(88%) saturate(2289%) hue-rotate(8deg) brightness(101%) contrast(98%);
}
</style>