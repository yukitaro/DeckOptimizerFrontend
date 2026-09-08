<script setup lang="ts">
import { EXPORT_FORMATS, ExportFormat } from '../../composables/useExportModal'

const isOpen = defineModel<boolean>({ default: false })

const selectedFormat = defineModel<string>('format', { default: 'default' })

defineProps<{
  formats?: ExportFormat[]
}>()

const emit = defineEmits<{
  (e: 'export'): void
}>()
</script>

<template>
  <v-dialog v-model="isOpen" max-width="500px">
    <v-card>
      <v-card-title class="text-h6 pa-4">
        <v-icon icon="mdi-file-export-outline" class="mr-2" />
        Select Export Format
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-radio-group v-model="selectedFormat" hide-details>
          <v-radio
            v-for="format in (formats || EXPORT_FORMATS)"
            :key="format.value"
            :value="format.value"
            color="primary"
            class="mb-2"
          >
            <template #label>
              <div>
                <div class="font-weight-medium text-body-1">{{ format.title }}</div>
                <div class="text-caption text-medium-emphasis">{{ format.subtitle }}</div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="isOpen = false">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-download"
          @click="emit('export')"
        >
          Download
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>