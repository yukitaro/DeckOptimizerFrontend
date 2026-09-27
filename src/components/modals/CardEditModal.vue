<template>
  <v-dialog
    v-model="isOpen"
    max-width="480px"
    transition="dialog-bottom-transition"
    scrollable
  >
    <!-- Explicit Dark Slate Container to prevent light theme leaks -->
    <v-card class="manabox-modal bg-slate-900 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      
      <!-- HEADER -->
      <div class="d-flex align-center justify-space-between px-5 pt-4 pb-3 border-b border-slate-800">
        <div class="d-flex align-center gap-2 overflow-hidden">
          <v-icon color="amber-accent-4" size="20">mdi-cards-against-humanity</v-icon>
          <h2 class="text-subtitle-1 font-weight-bold text-white text-truncate mb-0">
            {{ cardName }}
          </h2>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          color="slate-400"
          size="small"
          density="comfortable"
          @click="closeModal"
        />
      </div>

      <v-card-text class="pa-5 space-y-4">
        
        <!-- CARD THUMBNAIL & HEADER ROW -->
        <div class="d-flex gap-4 align-center bg-slate-800/60 p-3 rounded-xl border border-slate-800">
          <div class="w-16 shrink-0 rounded-md overflow-hidden border border-slate-700 shadow">
            <v-img
              :src="cardImageUrl"
              aspect-ratio="0.714"
              cover
            />
          </div>

          <div class="flex-grow-1 min-w-0">
            <div class="text-caption font-weight-bold text-amber-400 text-uppercase tracking-wider">
              {{ setCode }} • #{{ collectorNumber }}
            </div>
            <div class="text-body-2 font-weight-semibold text-slate-200 text-truncate">
              {{ cardName }}
            </div>
            <div class="text-caption text-slate-400 mt-1">
              Market: <span class="text-amber-300 font-weight-bold">{{ formattedPrice }}</span>
            </div>
          </div>
        </div>

        <!-- ROW 1: QUANTITY STEPPER -->
        <div class="manabox-row">
          <span class="manabox-label">Quantity</span>
          <div class="d-flex align-center gap-3">
            <v-btn
              icon="mdi-minus"
              size="x-small"
              color="slate-700"
              variant="flat"
              class="text-slate-200"
              :disabled="form.card_count <= 1"
              @click="decrementQty"
            />
            <span class="text-body-1 font-weight-bold text-white w-6 text-center">
              {{ form.card_count }}
            </span>
            <v-btn
              icon="mdi-plus"
              size="x-small"
              color="amber-400"
              variant="flat"
              class="text-slate-950 font-weight-bold"
              @click="form.card_count++"
            />
          </div>
        </div>

        <!-- ROW 2: FINISH PILL TOGGLE -->
        <div class="manabox-row">
          <span class="manabox-label">Finish</span>
          <div class="d-flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
            <button
              v-for="finishOpt in ['nonfoil', 'foil', 'etched']"
              :key="finishOpt"
              type="button"
              :class="[
                'px-3 py-1 text-xs font-weight-bold rounded-md transition-all capitalize',
                form.finish === finishOpt 
                  ? 'bg-amber-400 text-slate-950 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              ]"
              @click="form.finish = finishOpt"
            >
              {{ finishOpt === 'nonfoil' ? 'Normal' : finishOpt }}
            </button>
          </div>
        </div>

        <!-- ROW 3: CONDITION SELECT -->
        <div class="manabox-row">
          <span class="manabox-label">Condition</span>
          <v-select
            v-model="form.condition"
            :items="[
              { title: 'Near Mint', value: 'NM' },
              { title: 'Lightly Played', value: 'LP' },
              { title: 'Moderately Played', value: 'MP' },
              { title: 'Heavily Played', value: 'HP' },
              { title: 'Damaged', value: 'Damaged' }
            ]"
            item-title="title"
            item-value="value"
            density="compact"
            variant="solo"
            bg-color="slate-800"
            flat
            hide-details
            class="manabox-compact-select"
          />
        </div>

        <!-- ROW 4: LANGUAGE SELECT -->
        <div class="manabox-row">
          <span class="manabox-label">Language</span>
          <v-select
            v-model="form.language"
            :items="[
              { title: 'English (EN)', value: 'EN' },
              { title: 'Japanese (日)', value: 'JA' },
              { title: 'German (DE)', value: 'DE' },
              { title: 'French (FR)', value: 'FR' }
            ]"
            item-title="title"
            item-value="value"
            density="compact"
            variant="solo"
            bg-color="slate-800"
            flat
            hide-details
            class="manabox-compact-select"
          />
        </div>

        <!-- ROW 5: STORAGE LOCATION -->
        <div class="manabox-row">
          <span class="manabox-label">Storage Location</span>
          <v-text-field
            v-model="form.storage_location"
            placeholder="e.g. Binder 1"
            density="compact"
            variant="solo"
            bg-color="slate-800"
            flat
            hide-details
            class="manabox-compact-input"
          />
        </div>

        <!-- ROW 6: PURCHASE PRICE -->
        <div class="manabox-row">
          <span class="manabox-label">Purchase Price</span>
          <div class="d-flex align-center gap-1">
            <span class="text-amber-400 font-weight-bold text-caption">$</span>
            <v-text-field
              v-model.number="form.purchase_price"
              type="number"
              step="0.01"
              density="compact"
              variant="solo"
              bg-color="slate-800"
              flat
              hide-details
              class="manabox-compact-input w-28 text-right"
            />
          </div>
        </div>

        <!-- EXPANDABLE: COLLECTION TRANSFER -->
        <v-expansion-panels variant="accordion" class="rounded-xl overflow-hidden mt-2">
          <v-expansion-panel bg-color="slate-800" class="border border-slate-700/50">
            <v-expansion-panel-title class="text-caption font-weight-bold text-uppercase tracking-wider text-amber-400 py-2">
              <v-icon size="16" class="mr-2">mdi-folder-move-outline</v-icon>
              Transfer to Binder/Collection
            </v-expansion-panel-title>

            <v-expansion-panel-text class="pt-3">
              <div class="space-y-3">
                <v-select
                  v-model="moveForm.target_collection_id"
                  :items="availableCollections"
                  item-title="collection_name"
                  item-value="id"
                  label="Select Destination"
                  density="compact"
                  variant="outlined"
                  hide-details
                />

                <div class="d-flex align-center justify-space-between gap-3">
                  <v-text-field
                    v-model.number="moveForm.quantity"
                    label="Move Qty"
                    type="number"
                    :max="card?.card_count || 1"
                    min="1"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="w-28"
                  />

                  <v-btn
                    color="amber-400"
                    size="small"
                    variant="flat"
                    class="text-slate-950 font-weight-bold flex-grow-1"
                    :disabled="!moveForm.target_collection_id || moveLoading"
                    :loading="moveLoading"
                    @click="handleMoveCard"
                  >
                    Confirm Transfer
                  </v-btn>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- DYNAMIC VIEWS & TAGS -->
        <div class="pt-1">
          <div class="text-caption font-weight-bold text-uppercase tracking-wider text-slate-400 mb-1">
            Dynamic Lists & Tags
          </div>
          <v-select
            v-model="form.assigned_view_ids"
            :items="userViews"
            item-title="name"
            item-value="id"
            label="Assigned Dynamic Views"
            multiple
            chips
            closable-chips
            density="compact"
            variant="solo"
            bg-color="slate-800"
            flat
            hide-details
            class="manabox-multi-select"
          />
        </div>

      </v-card-text>

      <!-- FOOTER -->
      <div class="d-flex align-center justify-space-between pa-4 bg-slate-950 border-t border-slate-800">
        <v-btn
          variant="text"
          color="slate-400"
          class="rounded-xl px-4"
          @click="closeModal"
        >
          Cancel
        </v-btn>
        
        <v-btn
          color="amber-400"
          variant="flat"
          class="text-slate-950 font-weight-bold rounded-xl px-6"
          :loading="saveLoading"
          @click="saveCardDetails"
        >
          Save Changes
        </v-btn>
      </div>

    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, reactive, computed } from 'vue'
import axios from 'axios'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  card: { type: Object, default: null },
  currentCollectionId: { type: [Number, String], default: 0 },
  collectionsList: { type: Array, default: () => [] },
  userViews: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'card-updated', 'card-moved'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const saveLoading = ref(false)
const moveLoading = ref(false)

const form = reactive({
  card_count: 1,
  finish: 'nonfoil',
  condition: 'NM',
  storage_location: '',
  purchase_price: 0,
  language: 'EN',
  assigned_view_ids: []
})

const moveForm = reactive({
  target_collection_id: null,
  quantity: 1
})

// Robust fallbacks for nested properties across shapes
const cardName = computed(() => props.card?.card_from_set?.name || props.card?.name || 'Card Details')
const setCode = computed(() => (props.card?.card_from_set?.set_code || props.card?.set_code || 'MTG').toUpperCase())
const collectorNumber = computed(() => props.card?.card_from_set?.collector_number || props.card?.collector_number || '1')
const cardImageUrl = computed(() => props.card?.image_url || props.card?.card_from_set?.image_url || 'https://via.placeholder.com/150x210')

const formattedPrice = computed(() => {
  const price = props.card?.card_from_set?.card_metadata?.variant_prices?.[0]?.price ?? props.card?.purchase_price
  return price ? `$${price}` : 'N/A'
})

const availableCollections = computed(() => {
  if (!props.currentCollectionId) return props.collectionsList
  return props.collectionsList.filter(c => c.id !== Number(props.currentCollectionId))
})

watch(
  [() => props.card, () => props.modelValue],
  ([newCard, open]) => {
    if (newCard && open) {
      form.card_count = newCard.card_count ?? newCard.copies_owned ?? 1
      form.finish = newCard.finish ?? 'nonfoil'
      form.condition = newCard.condition ?? 'NM'
      form.storage_location = newCard.storage_location ?? ''
      form.purchase_price = newCard.purchase_price ?? 0
      form.language = newCard.language ?? 'EN'
      form.assigned_view_ids = newCard.views ? newCard.views.map(v => v.id) : []

      moveForm.target_collection_id = null
      moveForm.quantity = newCard.card_count ?? 1
    }
  },
  { immediate: true, deep: true }
)

function decrementQty() {
  if (form.card_count > 1) form.card_count--
}

function closeModal() {
  isOpen.value = false
}

async function saveCardDetails() {
  if (!props.card) return
  saveLoading.value = true

  try {
    const response = await axios.patch(`/api/collected-cards/${props.card.id}`, { ...form })
    emit('card-updated', response.data.card)
    closeModal()
  } catch (error) {
    console.error('Failed to update card:', error)
  } finally {
    saveLoading.value = false
  }
}

async function handleMoveCard() {
  if (!props.card || !moveForm.target_collection_id) return
  moveLoading.value = true

  try {
    const response = await axios.patch(
      `/api/collections/${props.currentCollectionId}/cards/${props.card.id}/move`,
      {
        target_collection_id: moveForm.target_collection_id,
        quantity: moveForm.quantity
      }
    )
    emit('card-moved', response.data)
    closeModal()
  } catch (error) {
    console.error('Failed to move card:', error)
  } finally {
    moveLoading.value = false
  }
}
</script>

<style scoped>
/* ManaBox Row Styling */
.manabox-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(30, 41, 59, 0.7); /* slate-800/70 */
  border: 1px solid rgba(51, 65, 85, 0.8); /* slate-700/80 */
  border-radius: 0.75rem; /* rounded-xl */
  padding: 0.5rem 0.875rem;
}

.manabox-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #cbd5e1; /* slate-300 */
}

/* Vuetify Field Overrides to keep inputs tight */
:deep(.manabox-compact-select .v-field),
:deep(.manabox-compact-input .v-field) {
  border-radius: 0.5rem !important;
  font-size: 0.875rem !important;
  min-height: 32px !important;
  max-height: 36px !important;
  box-shadow: none !important;
}

:deep(.manabox-compact-select .v-field__input),
:deep(.manabox-compact-input .v-field__input) {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
  min-height: 32px !important;
  color: #f8fafc !important; /* slate-50 */
}

:deep(.manabox-multi-select .v-field) {
  border-radius: 0.75rem !important;
  background-color: rgba(30, 41, 59, 0.7) !important;
  border: 1px solid rgba(51, 65, 85, 0.8) !important;
}
</style>