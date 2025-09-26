<template>
  <v-img
    :src="src"
    v-bind="$attrs"
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
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { brokenImageTracker } from '@/utils/brokenImageTracker'

interface Props {
  src: string
  cardName: string
}

const props = defineProps<Props>()
const hasBeenTested = ref(false)

// Test the URL immediately when component mounts
onMounted(() => {
  if (props.src && props.src.includes('gatherer.wizards.com')) {
    testUrlForRedirect(props.src, props.cardName);
  }
});

function handleMouseOver() {
  // Placeholder for future hover logic
}

async function testUrlForRedirect(url: string, cardName: string) {
  try {
    const response = await fetch('http://localhost:80/api/test-image-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        url: url,
        card_name: cardName
      })
    });

    if (response.ok) {
      const result = await response.json();

      if (result.is_broken) {
        brokenImageTracker.registerBrokenUrl(url, cardName);
      }
    }
  } catch (error) {
    // Silent fail — optionally handle error UI here
  }
}

function handleImageError() {
  // Also register on v-img error as backup
  if (props.src && props.cardName) {
    console.log(`v-img error detected for ${props.cardName}: ${props.src}`)
    brokenImageTracker.registerBrokenUrl(props.src, props.cardName)
  }
}

function handleImageLoad(event: Event) {
  // Keep the original detection as backup
  const img = event.target as HTMLImageElement
  
  if (img) {
    const isSmall = img.naturalWidth < 100 || img.naturalHeight < 100
    const isCardBack = img.src.includes('card_back.webp')
    
    if (isSmall || isCardBack) {
      console.log(`v-img load detected broken for ${props.cardName}: original=${props.src}, loaded=${img.src}, size=${img.naturalWidth}x${img.naturalHeight}`)
      brokenImageTracker.registerBrokenUrl(props.src, props.cardName)
    }
  }
}
</script>

<style scoped>
.image-fallback {
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 14px;
}
</style>