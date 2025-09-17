<script setup lang=ts>
import type { ComparisonItem } from '@/utils/types'
import { toRefs } from 'vue'
import { getColorManaCost, getNumericalManaCost, mapColorCodeToName} from '@/utils/deckUtils'

import { useDeckData } from '@/composables/useDeckData'
const { dictOfCardImageUrls } = useDeckData()

const props = defineProps<{
  card: ComparisonItem
  count: number | string
}>()
const { card } = toRefs(props)
const { count } = toRefs(props)
</script>

<template>
<div class="card-row">
  <Popper hover arrow placement="right">
    <!-- Trigger slot: the card name -->
    <div class="card-name-left">
      {{ card.name }}
    </div>

    <!-- Content slot: the image preview -->
    <template #content>
      <div class="popover-content">
        <img
          :src="dictOfCardImageUrls[card.name]"
          alt="Card preview"
          class="card-preview-img"
        />
      </div>
    </template>
  </Popper>
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

<style lang="scss" scoped>
.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 320px;
  max-width: 400px;
  padding: 4px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.card-name-left {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.card-mana-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  justify-content: flex-end;
}

.color-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.card-preview-img {
  max-width: 400px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.popover-content {
  padding: 8px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 6px;
}
</style>