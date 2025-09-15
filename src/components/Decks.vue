<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Colors from './Colors.vue';
import DeckComparison from './DeckComparison.vue';
import axios from 'axios';
import { useDeckData } from '@/composables/useDeckData'
import GroupedCardList from './GroupedCardList.vue';

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
const errorMessages = ref([])
const showErrorOverlay = ref(false)
const showErrorSnackbar = ref(false)
const selectedDeck = ref()
const hoveredCard = ref(null)

const { cardsInSelectedDeck, getCardsForDeck, listOfStoredDecks, setDecks } = useDeckData()

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

const tabLabels = ['Deck Import', 'Card List Test', 'Multi Deck Compare', 'Deck Display', 'Deck Display 2', 'Deck Comparison', 'Deck Swapping'];
const typeHierarchy = ['Creature', 'Artifact', 'Instant', 'Sorcery', 'Enchantment', 'Land'];

const groupedCards = computed(() => {
  const groups = {};

  // Initialize empty arrays for each type
  typeHierarchy.forEach(type => {
    groups[type] = [];
  });

  // Group cards by first matching type in hierarchy
  cardsInSelectedDeck.value.forEach(card => {
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

async function importCardsForDeck() {
    axios.defaults.withCredentials = true;
    axios.defaults.withXSRFToken = true;

    await axios.get(`${base_url}/sanctum/csrf-cookie`, { withCredentials: true });

    axios.post(`${base_url}/csrf-check`, {}, {withCredentials: true }).then(response => {
        console.log('CSRF check passed:', response.data);
    })
    .catch(error => {
    if (error.response && error.response.status === 419) {
        console.error('CSRF token mismatch (419). Token or session may be missing.');
    } else {
        console.error('Unexpected error:', error);
    }
    });

    try {
        const response = await axios.post(`${base_url}/deck`, {
            deckName: deckName.value,
            deckDescription: deckDescription.value,
            deckData: deckSomething.value,
            deckLink: externalLink.value
        });

        if (response.data.errors && response.data.errors.length > 0) {
            errorMessages.value = response.data.errors;
            showErrorSnackbar.value = true;
        }
    } catch (error) {
            errorMessages.value = [error.message];
            showErrorSnackbar.value = true;
    }
}

async function getDecksFromDB() {
    try {
        const response = await axios.get(`${base_url}/api/decks`, {
            params: {
                limit: 10
            }
        });

        if (response.data.errors && response.data.errors.length > 0) {
        } else {
          setDecks(response.data.map(deckData => ({
                deck_id: deckData.id,
                deck_name: deckData.deck_name,
                description: deckData.description,
            })))
          console.log("Complete return value: " + JSON.stringify(listOfStoredDecks.value));
        }
    } catch (error) {
        console.log("oops an error!" + error);
    }    
}

// 1️⃣ Computed “active” card: hoveredCard or firstInDeck
const activeCard = computed(() => {
  return (
    hoveredCard.value ||
    cardsInSelectedDeck.value[0] ||
    { image_url_to_use: null, name: '' }
  )
})

// 2️⃣ When the deck’s cards load, clear any stale hover so we default to first card
watch(cardsInSelectedDeck, (newVal) => {
  hoveredCard.value = null
})

onMounted(() => {
    getDecksFromDB()
})
</script>

<template>
  <v-card>
    <v-toolbar color="primary">
      <v-app-bar-nav-icon></v-app-bar-nav-icon>
      <v-toolbar-title>Deck Management</v-toolbar-title>
      <v-btn icon="mdi-magnify"></v-btn>
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
        <v-card class="custom-card-background" v-if="tab==='Deck Import'">
          <v-card-text>
                <v-form v-model="valid">
                    <v-row gutters>
                        <v-col cols="7">
                            <v-row class="d-flex center">
                                <v-col cols="2" class="d-flex">
                                    <v-btn @click="importCardsForDeck" type="button" class="import-button" block>Import</v-btn>
                                </v-col>
                                <v-col cols="4">
                                <v-text-field class="cool-mist-text-field"
                                    v-model="deckName"
                                    label="Deck name"
                                    variant="outlined"
                                    required
                                ></v-text-field>
                                </v-col>
                                <v-col cols="6">
                                <v-text-field class="cool-mist-text-field"
                                    v-model="deckDescription"
                                    label="Deck description"
                                    required
                                    color="secondary-darken-2"
                                ></v-text-field>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col cols="12">
                                <v-text-field class="cool-mist-text-field"
                                    v-model="externalLink"
                                    label="Link to deck"
                                    required
                                    color="primary"                                    
                                ></v-text-field>
                                </v-col>
                            </v-row>
                        </v-col>
                        <v-col cols="5">
                            <v-textarea class="cool-mist-text-field"
                                v-model="deckSomething"
                                label="Deck something"
                                rows="40"
                                row-height="25"
                                color=""
                                @keydown.enter.exact.prevent="importCardsForDeck"
                            ></v-textarea>
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
          <v-text-field
            v-model="deckSearch"
            label="Search decks"
            placeholder="Goblin, Rakdos, Mono Blue Terror…"
            clearable
            class="mb-4"
          />

          <v-autocomplete
            v-model="selectedDeck"
            :items="filteredDecks"
            item-title="deck_name"
            item-value="deck_id"
            return-object
            label="Select a Deck"
            class="mb-4"
          >
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
            <v-list-item-content>
                <v-list-item-title class="text-wrap">
                {{ typeof error === 'string' ? error : error.error }}
                </v-list-item-title>
                <v-list-item-subtitle v-if="error.line">
                Line {{ error.line }}: {{ error.input }}
                </v-list-item-subtitle>
            </v-list-item-content>
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
