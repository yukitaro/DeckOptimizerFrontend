<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Colors from './Colors.vue';
import SmartCardImage from './SmartCardImage.vue';

import DeckComparison from './DeckComparison.vue';
import axios from 'axios';
import { useDeckData } from '@/composables/useDeckData'
import GroupedCardList from './GroupedCardList.vue';
import { brokenImageTracker } from '@/utils/brokenImageTracker';

import {
  getNumericalManaCost,
  getColorManaCost,
  mapColorCodeToName,
} from '@/utils/deckUtils'
import MultiDeckComparison from './MultiDeckComparison.vue';

const base_url = "http://localhost:80";
const router = useRouter()
const route = useRoute()
const tab = ref('Deck Import')
const deckName = ref('')
const deckDescription = ref('')
const deckSomething = ref('')
const externalLink = ref('')
const archetype = ref('')
const deckFormat = ref('')
const errorMessages = ref([])
const showErrorOverlay = ref(false)
const showErrorSnackbar = ref(false)
const selectedDeck = ref()
const hoveredCard = ref(null)
const deckToDelete = ref(null)
const showConfirmDialog = ref(false)

const { cardsInSelectedDeck, deleteDeck, getCardsForDeck, getDecksFromDB, handleSingleDeckChange, listOfStoredDecks, setDecks } = useDeckData()

// Mk. ][
const deckSearch = ref('')
const selectedDeckMk2 = ref(null)

const filteredDecks = computed(() => {
  const query = deckSearch.value.toLowerCase()
  return listOfStoredDecks.value.filter(deck => {
    const name = deck.deck_name?.toLowerCase() || ''
    const desc = deck.description?.toLowerCase() || ''
    return name.includes(query) || desc.includes(query)
  })
})

const tabLabels = ['Deck Import', 'Card List Test', 'Multi Deck Compare', 'Deck Display', 'Deck Display 2', 'Deck Management','Deck Comparison', 'Deck Swapping'];
const typeHierarchy = ['Creature', 'Artifact', 'Instant', 'Sorcery', 'Enchantment', 'Land'];

const groupedCards = computed(() => {
  const groups = {};

  // Initialize empty arrays for each type
  typeHierarchy.forEach(type => {
    groups[type] = [];
  });

  // Get the cards for the first deck (single deck display tabs use index 0)
  const currentDeckCards = cardsInSelectedDeck.value[0] || [];
  
  // Group cards by first matching type in hierarchy
  currentDeckCards.forEach(card => {
    const typeString = card.type || '';
    
    // Force Land to take precedence if present
    let matchedType = null;
    if (typeString.includes('Land')) {
      matchedType = 'Land';
    } else {
      matchedType = typeHierarchy.find(type => typeString.includes(type));
    }

    if (matchedType) {
      groups[matchedType].push(card);
    }
  });

  return groups;
});

const search = computed({
  get() {
    return route.query.search ?? ''
  },
  set(search) {
    router.replace({ query: { search } })
  }
})

watch(showErrorSnackbar, (val) => {
  if (val) {
    setTimeout(() => {
      showErrorSnackbar.value = false;
    }, 8000);
  }
});

watch(selectedDeck, async (newDeck) => {
  if (newDeck) {
    try {
      await getCardsForDeck(newDeck.deck_id);
    } catch (error) {
      console.error("Error fetching deck:", error)
    }
  }
})

watch(tab, async (newTab) => {
  if (newTab === 'Deck Management') {
    await getDecksFromDB();
  }
});


async function importCardsForDeck() {
    try {
        console.log('Importing deck...', {
            name: deckName.value,
            description: deckDescription.value,
            link: externalLink.value,
            archetype: archetype.value,
            dataLength: deckSomething.value.length
        });

        // Make the deck import request using API route (no CSRF needed)
        const response = await axios.post(`${base_url}/api/deck`, {
            deckName: deckName.value,
            deckDescription: deckDescription.value,
            deckData: deckSomething.value,
            deckLink: externalLink.value,
            deckArchetype: archetype.value
        }, { 
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('Deck import response:', response.data);

        if (response.data.errors && response.data.errors.length > 0) {
            errorMessages.value = response.data.errors;
            showErrorSnackbar.value = true;
        } else {
            // Success! Clear the form and show success message
            deckName.value = '';
            deckDescription.value = '';
            deckSomething.value = '';
            externalLink.value = '';
            archetype.value = '';
            console.log('Deck imported successfully!');
            
            // Refresh the deck list
            //await getDecksFromDB();
        }
    } catch (error) {
        console.error('Import error:', error);
        
        if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Error status:', error.response.status);
            
            if (error.response.status === 419) {
                errorMessages.value = ['CSRF token mismatch. Please refresh the page and try again.'];
            } else if (error.response.data && error.response.data.message) {
                errorMessages.value = [error.response.data.message];
            } else if (error.response.data && error.response.data.errors) {
                errorMessages.value = Array.isArray(error.response.data.errors) 
                    ? error.response.data.errors 
                    : [error.response.data.errors];
            } else {
                errorMessages.value = [`Server error (${error.response.status}): ${error.response.statusText}`];
            }
        } else {
            errorMessages.value = [error.message || 'Network error occurred'];
        }
        
        showErrorSnackbar.value = true;
    }
}

async function sendBrokenUrlsToBackend() {
    try {
        const result = await brokenImageTracker.sendBrokenUrlsToBackend();
        if (result) {
            console.log('Broken URLs sent successfully:', result);
            // Optionally clear the local tracking after successful send
            brokenImageTracker.clearBrokenUrls();
        }
    } catch (error) {
        console.error('Failed to send broken URLs:', error);
    }
}

function debugBrokenUrls() {
    brokenImageTracker.debugBrokenUrls();
}

async function deleteADeck() {
  try {
    await deleteDeck(deckToDelete.value.deck_id);

    listOfStoredDecks.value = listOfStoredDecks.value.filter(deck => deck.deck_id !== deckToDelete.value.deck_id);
    toastMessage.value = 'Deck deleted successfully';
  } catch(err) {
    toastMessage.value = 'Error deleting deck!'
  } finally {
  showConfirmDialog.value = false;
  showToast.value = true;
  }
}

function confirmDelete(deck) {
  deckToDelete.value = deck;
  showConfirmDialog.value = true;
}

const showToast = ref(false);
const toastMessage = ref('');

// 1️⃣ Computed “active” card: hoveredCard or firstInDeck
const activeCard = computed(() => {
  return (
    hoveredCard.value ||
    cardsInSelectedDeck.value[0] ||
    { image_url_to_use: null, name: '' }
  )
})

function switchToDeckDisplay(deck) {
  handleSingleDeckChange(deck)
  //selectedDeck.value = deck;
  tab.value = 'Deck Display 2';
}

// 2️⃣ When the deck’s cards load, clear any stale hover so we default to first card
watch(cardsInSelectedDeck, (newVal) => {
  hoveredCard.value = null
})

onMounted(async () => {
    await getDecksFromDB()
})
</script>

<template>
  <v-card>
    <v-toolbar color="primary">
      <v-app-bar-nav-icon></v-app-bar-nav-icon>
      <v-toolbar-title>Deck Management</v-toolbar-title>
      <v-btn icon="mdi-magnify"></v-btn>
      <v-btn 
        @click="debugBrokenUrls"
        icon="mdi-bug" 
        title="Debug: Show broken URLs in console"
      ></v-btn>
      <v-btn 
        @click="sendBrokenUrlsToBackend"
        icon="mdi-image-broken" 
        title="Report broken image URLs to backend for batch fixing"
      ></v-btn>
      <v-btn icon="mdi-dots-vertical"></v-btn>

      <template v-slot:extension>
        <v-tabs v-model="tab" align-tabs="center">
          <v-tab v-for="label in tabLabels" :key="label" :value="label">
            {{ label }}
          </v-tab>
        </v-tabs>
      </template>
    </v-toolbar>
    <!-- 
    https://vuetifyjs.com/en/styles/colors/#material-colors
    -->
    <v-window v-model="tab" transition="false">
        <div
        v-if="showErrorSnackbar"
        class="error-toast"
        @click="showErrorOverlay = true"
        >
        Errors occurred during import. <span class="view-details">View details</span>
        </div>        
        <v-card class="deck-import-card" v-if="tab==='Deck Import'">
          <v-card-text class="pa-6">
            <div class="deck-import-header mb-6">
              <h2 class="text-h4 font-weight-bold text-primary mb-2">Import New Deck</h2>
              <p class="text-subtitle-1 text-medium-emphasis">
                Create a new deck by filling in the details and pasting your decklist
              </p>
            </div>

            <v-form>
              <v-row class="deck-import-layout" no-gutters>
                <!-- Left Panel: Deck Information -->
                <v-col cols="12" lg="5" class="deck-info-panel">
                  <div class="info-panel-content">
                    <h3 class="text-h6 font-weight-medium mb-4 text-primary">Deck Information</h3>
                    
                    <v-text-field v-model="deckName" label="Deck Name" variant="outlined" density="comfortable" class="deck-input mb-4"
                      prepend-inner-icon="mdi-cards-variant" required :rules="[v => !!v || 'Deck name is required']" />

                    <v-text-field v-model="deckDescription" label="Deck Description" variant="outlined" density="comfortable"
                      class="deck-input mb-4" prepend-inner-icon="mdi-text" required :rules="[v => !!v || 'Description is required']" />

                    <v-text-field v-model="externalLink" label="Deck Link (Optional)" variant="outlined" density="comfortable"
                      class="deck-input mb-6" prepend-inner-icon="mdi-link" hint="Link to deck on external site (MTGGoldfish, Archidekt, etc.)" persistent-hint />

                    <v-row>
                      <v-col cols="6">
                        <v-text-field v-model="archetype" label="Archetype (Optional)" variant="outlined" density="comfortable"
                          class="deck-input mb-6" hint="Mono Blue Terror, Rakdos Madness, Tron, etc." persistent-hint />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field v-model="deckFormat" label="Format (Default: Pauper)" variant="outlined" density="comfortable"
                          class="deck-input mb-6" hint="Pauper, Standard, Commander, etc." persistent-hint />
                      </v-col>
                    </v-row>

                    <v-btn @click="importCardsForDeck" type="button" class="import-action-btn" color="primary" size="large"
                      variant="elevated" block :disabled="!deckName || !deckDescription || !deckSomething" prepend-icon="mdi-upload">
                      Import Deck
                    </v-btn>
                  </div>
                </v-col>

                <!-- Right Panel: Decklist Input -->
                <v-col cols="12" lg="7" class="decklist-panel">
                  <div class="decklist-content">
                    <div class="d-flex align-center justify-space-between mb-4">
                      <h3 class="text-h6 font-weight-medium text-primary">Decklist</h3>
                      <v-chip color="info" variant="outlined" size="small">
                        <v-icon start icon="mdi-information"></v-icon>
                        Ctrl+Enter to Import
                      </v-chip>
                    </div>
                    
                    <v-textarea v-model="deckSomething" label="Paste your decklist here" variant="outlined" class="decklist-input"
                      rows="24" no-resize hint="Format: 4x Lightning Bolt or 4 Lightning Bolt (one card per line)" persistent-hint
                      @keydown.ctrl.enter.exact.prevent="importCardsForDeck">
                      <template #prepend-inner>
                        <div class="decklist-helper">
                          <v-icon color="primary">mdi-format-list-numbered</v-icon>
                        </div>
                      </template>
                    </v-textarea>
                  </div>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
        </v-card>
        <v-card v-if="tab === 'Card List Test'" class="pa-4 custom-card-background">
          <!-- 🧠 Deck Display -->
          <div class="deck-display-flex">
            <!-- 👁️ Preview Pane -->
            <div class="preview-pane">
              <v-img
                v-if="activeCard.image_url_to_use"
                :src="activeCard.image_url_to_use"
                alt="Card preview"
                width="300"
                aspect-ratio="0.714"
                class="mb-2"
              >
                <template #placeholder>
                  <div class="image-fallback">Loading…</div>
                </template>
                <template #error>
                  <div class="image-fallback">No preview available</div>
                </template>
              </v-img>
              <div v-else class="image-fallback mb-2">No preview available</div>
              <p class="preview-name">{{ activeCard.name || 'Hover a card…' }}</p>
            </div>
          <!-- <GroupedCardList :cards-in-selected-deck="groupedCards" /> -->           
          <GroupedCardList v-model:hovered-card="hoveredCard"/>
          <pre>Hovered in parent: {{ hoveredCard }}</pre>          
          </div>
        </v-card>
        <v-card v-if="tab === 'Multi Deck Compare'" class="pa-4 custom-card-background">
            <MultiDeckComparison />
        </v-card>
        <v-card v-if="tab === 'Deck Display'" class="pa-4 custom-card-background">
          <!-- Deck selector -->
        <v-autocomplete
          v-model="selectedDeck"
          :items="listOfStoredDecks"
          item-title="displayName"
          item-value="deck_id"
          return-object
          label="Select a Deck"
          :menu-props="{ maxHeight: '300px' }"
          hide-details/>

          <!-- Flex container: preview on the left, list on the right -->
          <div class="deck-display-flex">
            <!-- Sticky Preview Pane -->
            <div class="preview-pane">
              <v-img
                v-if="activeCard.image_url_to_use"
                :src="activeCard.image_url_to_use"
                alt="Card preview"
                width="360"
                aspect-ratio="0.714"
                class="mb-2"
              >
                <template #placeholder>
                  <div class="image-fallback">Loading…</div>
                </template>
                <template #error>
                  <div class="image-fallback">No preview available</div>
                </template>
              </v-img>

              <div v-else class="image-fallback mb-2">
                No preview available
              </div>

              <p class="preview-name">
                {{ activeCard.name || 'Hover a card…' }}
              </p>
            </div>

            <!-- Scrollable Card List -->
            <div class="card-list-container">
              <div class="card-list">
                <div v-for="type in typeHierarchy" :key="type">
                  <h3>{{ type }}</h3>
                  <div v-if="groupedCards[type].length">
                    <div v-for="card in groupedCards[type]" :key="card.id" class="card-line">
                      <p>
                        <strong>{{ card.card_count }}x</strong>
                        <!-- hover only on name -->
                        <span class="card-name" @mouseover="hoveredCard = card">{{ card.name }}</span>
                        —
                        <span class="card-type">{{ card.type }}</span>

                        <span v-if="card.mana_cost">
                          <Colors :mana_cost="getNumericalManaCost(card.mana_cost)" />
                        </span>
                        <span v-for="color in getColorManaCost(card.mana_cost)" :key="color">
                          <Colors :color_name="mapColorCodeToName(color)" />
                        </span>
                      </p>
                    </div>
                  </div>
                  <p v-else class="empty-group">
                    No {{ type.toLowerCase() }} cards
                  </p>
                </div>
              </div>
            </div>
          </div>
        </v-card>
        <v-card v-if="tab === 'Deck Display 2'" class="pa-4 custom-card-background">
<!-- 🔍 Deck Selector -->
          <v-text-field v-model="deckSearch" label="Search decks" placeholder="Goblin, Rakdos, Mono Blue Terror…" clearable class="mb-4" />
          <v-autocomplete v-model="selectedDeck" :items="filteredDecks" item-title="deck_name" item-value="deck_id" return-object label="Select a Deck"
            class="mb-4" @update:model-value="handleSingleDeckChange">
            <template #item="{ item, props }">
              <v-list-item v-bind="props" :key="item.deck_id">
                <v-list-item-title>{{ item.deck_name }}</v-list-item-title>
                <v-list-item-subtitle v-if="item.description">
                  {{ item.description }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
            <template #selection="{ item }">
              <span>{{ item.deck_name }}</span>
            </template>
          </v-autocomplete>

          <!-- 🧠 Deck Display -->
          <div class="deck-display-flex">
            <!-- 👁️ Preview Pane -->
            <div class="preview-pane">
              <SmartCardImage
                v-if="activeCard.image_url_to_use"
                :src="activeCard.image_url_to_use"
                :card-name="activeCard.name || 'Unknown Card'"
                alt="Card preview"
                width="300"
                aspect-ratio="0.714"
                class="mb-2"
              />
              <div v-else class="image-fallback mb-2">No preview available</div>
              <p class="preview-name">{{ activeCard.name || 'Hover a card…' }}</p>
            </div>

    <!-- 📜 Deck List -->
    <div class="card-list-container">
      <div class="card-list">
        <div v-for="type in typeHierarchy" :key="type">
          <h3>{{ type }}</h3>
          <div v-if="groupedCards[type].length">
            <div
              v-for="card in groupedCards[type]"
              :key="card.id"
              class="card-line"
            >
              <!-- Hidden SmartCardImage for URL testing -->
              <SmartCardImage
                v-if="card.image_url_to_use"
                :src="card.image_url_to_use"
                :card-name="card.name"
                style="display: none;"
              />
              
              <p>
                <strong>{{ card.card_count }}x</strong>
                <span class="card-name" @mouseover="hoveredCard = card">
                  {{ card.name }}
                </span>
                —
                <span class="card-type">{{ card.type }}</span>
                <span v-if="card.mana_cost">
                  <Colors :mana_cost="getNumericalManaCost(card.mana_cost)" />
                </span>
                <span
                  v-for="color in getColorManaCost(card.mana_cost)"
                  :key="color"
                >
                  <Colors :color_name="mapColorCodeToName(color)" />
                </span>
              </p>
            </div>
          </div>
          <p v-else class="empty-group">
            No {{ type.toLowerCase() }} cards
          </p>
        </div>
      </div>
    </div>
  </div>
</v-card>
<v-card v-if="tab === 'Deck Management'" class="pa-4 custom-card-background">
  <v-snackbar v-model="showToast" :timeout="3000">
    {{ toastMessage }}
  </v-snackbar>
  <v-list>
    <v-list-item v-for="(deck, index) in listOfStoredDecks" :key="deck.deck_id" @click="switchToDeckDisplay(deck)" style="cursor:pointer;">
        <v-list-item-title>{{ deck.deck_name }}</v-list-item-title>
        <v-list-item-subtitle v-if="deck.description">{{ deck.description }}</v-list-item-subtitle>
        {{ deck.archetype }}
        <v-icon class="ml-auto" @click.stop="confirmDelete(deck)" title="Delete Deck">mdi-delete</v-icon>
      <v-divider v-if="index < listOfStoredDecks.length - 1" class="my-2"></v-divider>
    </v-list-item>
  </v-list>
</v-card>
<v-dialog v-model="showConfirmDialog" max-width="400">
  <v-card>
    <v-card-title class="text-h6">Confirm Deletion</v-card-title>
    <v-card-text>
      Are you sure you want to delete <strong>{{ deckToDelete?.deck_name }}</strong>?
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn text @click="showConfirmDialog = false">Cancel</v-btn>
      <v-btn color="red" @click="deleteADeck">Delete</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>
<v-card v-if="tab === 'Deck Comparison'" class="pa-4 custom-card-background">
  <DeckComparison :listOfStoredDecks = listOfStoredDecks />
</v-card>
    </v-window>
  </v-card>
    <v-dialog v-model="showErrorOverlay" max-width="600">
    <v-card>
        <v-toolbar color="red" dark>
        <v-toolbar-title>Error Details</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="showErrorOverlay = false">
            <v-icon>mdi-close</v-icon>
        </v-btn>
        </v-toolbar>
        <v-card-text style="max-height: 400px; overflow-y: auto;">
        <v-list>
            <v-list-item
            v-for="(error, index) in errorMessages"
            :key="index">
                <v-list-item-title class="text-wrap">
                {{ typeof error === 'string' ? error : error.error }}
                </v-list-item-title>
                <v-list-item-subtitle v-if="error.line">
                Line {{ error.line }}: {{ error.input }}
                </v-list-item-subtitle>
            </v-list-item>
        </v-list>
        </v-card-text>
        <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="showErrorOverlay = false">Close</v-btn>
        </v-card-actions>
    </v-card>
    </v-dialog>  
</template>

<style scoped>
.import-container {
  position: relative;
  height: 60px; /* ensures space for the toast above */
}

.custom-card-background {
    background-color: #48a9a6
}

.cool-mist-text-field ::v-deep(.v-field) {
  background-color: #e3f2fd;
  border-radius: 4px;
  margin-top: -1px;
  padding-top: 0;
  min-height: 0;
}

.error-toast {
  position: absolute;
  top: 60px;
  left: 0;
  background-color: #f44336;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  z-index: 100;
  font-size: 14px;
  max-width: 300px;
}

.view-details {
  text-decoration: underline;
  font-weight: bold;
  margin-left: 6px;
}

.field-contrast {
  background-color: #ffffff;
  border-radius: 4px;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-line p {
  margin: 0;
  padding: 2px 0;
  font-size: 14px;
}

.card-type {
  color: #666;
  font-style: italic;
}

/* Always reserves the space */
.preview-pane {
  position: sticky;
  top: 100px;
  align-self: flex-start;

  width: 300px;               /* user-requested width */
  min-height: 420px;          /* reserve roughly 300×420 card area */
  padding: 8px;
  background-color: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  border-radius: 4px;
  text-align: center;
}

/* fallback box */
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

/* Wraps list + preview side by side */
.deck-display-flex {
  display: flex;
  gap: 16px;
}

/* Makes only the card list scrollable */
.card-list-container {
  flex: 1;                        /* take remaining width */
  max-height: calc(100vh - 200px); /* adjust 200px to account for toolbar + autocomplete + padding */
  overflow-y: auto;
}

/* Ensure the preview sticks and starts at the top of the flex row */
.preview-pane {
  position: sticky;
  top: 100px;       /* buffer from top of viewport */
  align-self: flex-start;
}

.scrollable-card-list {
  overflow-y: auto;
  padding-right: 12px;
  height: 100%;  
}

/* Deck Import Styles */
.deck-import-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.deck-import-header {
  text-align: center;
  padding: 16px 0;
  background: linear-gradient(90deg, rgba(33, 150, 243, 0.1), rgba(76, 175, 80, 0.1));
  border-radius: 12px;
  margin: -8px -8px 24px -8px;
}

.deck-import-layout {
  gap: 24px;
}

.deck-info-panel {
  padding: 0 12px 0 0;
}

.info-panel-content {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 24px;
  height: 100%;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.decklist-panel {
  padding: 0 0 0 12px;
}

.decklist-content {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 24px;
  height: 100%;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.deck-input {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
}

.deck-input ::v-deep(.v-field) {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.deck-input ::v-deep(.v-field:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.deck-input ::v-deep(.v-field--focused) {
  box-shadow: 0 4px 16px rgba(33, 150, 243, 0.2);
}

.decklist-input {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
}

.decklist-input ::v-deep(.v-field) {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.4;
}

.decklist-input ::v-deep(.v-field__input) {
  min-height: 400px !important;
}

.decklist-helper {
  position: absolute;
  top: 8px;
  left: 8px;
  opacity: 0.6;
}

.import-action-btn {
  border-radius: 12px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 16px rgba(33, 150, 243, 0.3);
  transition: all 0.3s ease;
}

.import-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
}

.import-action-btn:disabled {
  opacity: 0.6;
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Mobile responsive adjustments */
@media (max-width: 1280px) {
  .deck-import-layout {
    flex-direction: column;
  }
  
  .deck-info-panel,
  .decklist-panel {
    padding: 0;
    margin-bottom: 16px;
  }
  
  .decklist-input ::v-deep(.v-field__input) {
    min-height: 300px !important;
  }
}

.deck-browser {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.deck-list {
  flex: 1;
  max-height: 500px;
  overflow-y: auto;
  border-right: 1px solid #ccc;
  padding-right: 16px;
}

.deck-entry {
  padding: 8px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.deck-entry:hover {
  background-color: #f5f5f5;
}

.deck-preview {
  flex: 1;
  padding-left: 16px;
}

</style>
