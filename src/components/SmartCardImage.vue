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
  console.log(`🏗️ SmartCardImage mounted for ${props.cardName} with URL: ${props.src}`)
  
  if (props.src && props.src.includes('gatherer.wizards.com')) {
    console.log(`🎯 Auto-testing URL for ${props.cardName}`)
    testUrlForRedirect(props.src, props.cardName)
  } else {
    console.log(`⏭️ Skipping test for ${props.cardName} - not a gatherer URL`)
  }
})

function handleMouseOver() {
  // Just a placeholder - the real testing happens on mount now
  console.log(`🐭 Mouse over detected for ${props.cardName}`)
}

async function testUrlForRedirect(url: string, cardName: string) {
  try {
    console.log(`🔍 Testing URL for redirect via backend: ${cardName} - ${url}`)
    
    // Call backend to test the URL for redirects
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
    })
    
    console.log(`📡 Response status for ${cardName}: ${response.status}`)
    
    if (response.ok) {
      const result = await response.json()
      
      console.log(`✅ Backend test result for ${cardName}:`, result)
      
      if (result.is_broken) {
        console.log(`🚫 **BROKEN URL DETECTED:** ${cardName} - ${url}`)
        console.log(`🔧 About to register broken URL for ${cardName}`)
        brokenImageTracker.registerBrokenUrl(url, cardName)
        console.log(`✅ Registration completed for ${cardName}`)
      } else {
        console.log(`✅ URL is good for ${cardName}`)
      }
    } else {
      console.warn(`❌ Backend test failed for ${cardName}: ${response.status} ${response.statusText}`)
    }
    
  } catch (error) {
    console.error(`💥 Error testing URL for ${cardName}:`, error)
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