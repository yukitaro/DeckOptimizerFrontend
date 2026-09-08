<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getUserLists, getListWithItems, updateListItem } from '@/api/listClient'
import ExportDialog from './modals/ExportDialog.vue'
import { useExportModal } from '@/composables/useExportModal'

const lists = ref([])
const selectedListId = ref(null)
const listItems = ref([])
const cardsFromList = ref([])
const loading = ref(false)
const exportModal = useExportModal(cardsFromList)

onMounted(async () => {
  lists.value = await getUserLists()
})

async function loadList() {
  if (!selectedListId.value) return
  loading.value = true
  listItems.value = await getListWithItems(selectedListId.value)
  cardsFromList.value = listItems.value.map(item => item.card)
  cardsFromList.value.forEach(card => {
    if (card.card_metadata.prices.usd_foil) {
      card.price_usd = card.card_metadata.prices.usd_foil
    } else {
      card.price_usd = card.card_metadata.prices.usd
    }
    card.quantity = card.quantity || 1
  })
  loading.value = false
}

async function updateItem(item) {
  await updateListItem(selectedListId.value, item.id, {
    metadata: item.metadata,
    quantity: item.quantity
  })
}

const totalValue = computed(() => {
  return listItems.value.reduce((sum, item) => {
    const price = item.metadata.is_foil
      ? item.card.card_metadata.prices.usd_foil
      : item.card.card_metadata.prices.usd

    return sum + (price || 0) * item.quantity
  }, 0)
})
</script>

<template>
  <v-card class="pa-4">
    <h2 class="text-h5 mb-4">Pricing Panel</h2>

    <!-- Select List -->
    <v-select
      v-model="selectedListId"
      :items="lists"
      item-title="name"
      item-value="id"
      label="Select Dynamic List"
      @update:modelValue="loadList"
    />
      <v-spacer />
      <!-- Trigger button -->
      <v-btn
        color="primary"
        prepend-icon="mdi-export"
        :disabled="!listItems.length"
        @click="exportModal.open()"
      >
        Export
      </v-btn>
    <v-divider class="my-4" />

    <!-- Items Table -->
    <v-data-table
      :items="listItems"
      :loading="loading"
      class="elevation-1"
    >
      <template #headers>
        <tr>
          <th>Card</th>
          <th>Set</th>
          <th>Foil</th>
          <th>Qty</th>
          <th>Purchase Price</th>
          <th>Condition</th>
          <th>Current Price</th>
          <th>Total</th>
        </tr>
      </template>

      <template #item="{ item }">
        <tr>
          <td>{{ item.card.name }}</td>
          <td>{{ item.card.set_name }}</td>

          <!-- Foil Toggle -->
          <td>
            <v-switch
              v-model="item.metadata.is_foil"
              @change="updateItem(item)"
              inset
            />
          </td>

          <!-- Quantity -->
          <td>
            <v-text-field
              v-model.number="item.quantity"
              type="number"
              min="1"
              style="max-width: 70px"
              @change="updateItem(item)"
            />
          </td>

          <!-- Purchase Price -->
          <td>
            <v-text-field
              v-model.number="item.metadata.purchase_price"
              type="number"
              min="0"
              step="0.01"
              style="max-width: 90px"
              @change="updateItem(item)"
            />
          </td>

          <!-- Condition -->
          <td>
            <v-select
              v-model="item.metadata.condition"
              :items="['NM', 'LP', 'MP', 'HP', 'DMG']"
              style="max-width: 90px"
              @change="updateItem(item)"
            />
          </td>

          <!-- Current Price -->
          <td>
            {{
              item.metadata.is_foil
                ? item.card.card_metadata.prices.usd_foil
                : item.card.card_metadata.prices.usd
            }}
          </td>

          <!-- Total -->
          <td>
            {{
              ((item.metadata.is_foil
                ? item.card.card_metadata.prices.usd_foil
                : item.card.card_metadata.prices.usd) || 0) * item.quantity
            }}
          </td>
        </tr>
      </template>
    </v-data-table>

    <v-divider class="my-4" />

    <!-- Total Value -->
    <div class="text-h6">
      Total Value: ${{ totalValue.toFixed(2) }}
    </div>
  </v-card>
  <ExportDialog
        v-model="exportModal.isOpen.value"
        v-model:format="exportModal.selectedFormat.value"
        :formats="exportModal.formats"
        @export="exportModal.exportData"
      />  
</template>
