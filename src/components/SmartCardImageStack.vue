<template>
  <div class="card-stack" :style="{ width: width + 'px' }">
    <v-img
      v-for="i in count"
      :key="i"
      :src="src"
      v-bind="$attrs"
      :width="width"
      :aspect-ratio="0.714"
      class="card-stack-item"
      :style="{ left: `${i * overlap}px`, zIndex: i }"
      @error="handleImageError"
      @load="handleImageLoad"
    >
      <template #placeholder>
        <slot name="placeholder">
          <div class="image-fallback">Loading…</div>
        </slot>
      </template>
      <template #error>
        <slot name="error">
          <div class="image-fallback">No preview available</div>
        </slot>
      </template>
    </v-img>
    <span v-if="showCount" class="card-count">{{ count }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  src: string
  cardName: string
  count?: number
  overlap?: number
  width?: number
  showCount?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  count: 1,
  overlap: 5,
  width: 150,
  showCount: true
})

// reuse your existing error/load logic here
</script>

<style scoped>
.card-stack {
  position: relative;
  display: inline-block;
  height: 210px; /* match your card height */
}
.card-stack-item {
  position: absolute;
  top: 0;
}
.card-count {
  position: absolute;
  bottom: 4px;
  right: 6px;
  background: rgba(0,0,0,0.7);
  color: white;
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
