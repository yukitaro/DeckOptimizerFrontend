<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios';

const base_url = "http://localhost:80";
const router = useRouter()
const route = useRoute()
const createDeckDiv = ref(false)
const model = ref('1')
const tab = ref('1')
const deckName = ref('')
const deckDescription = ref('')
const deckSomething = ref('')
const externalLink = ref('')
const errorMessages = ref([])
const showErrorOverlay = ref(false)
const showErrorSnackbar = ref(false)
const listOfStoredDecks = ref([])
const selectedDeck = ref()
const cardsInSelectedDeck = ref([])

const tableHeaders = [
  { text: 'Card Name', value: 'card_name' },
  { text: 'Mana Cost', value: 'mana_cost' },
  { text: 'Type', value: 'type' },
  { text: 'Power', value: 'power' },
  { text: 'Toughness', value: 'toughness' }
]

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
      //await axios.get(`${base_url}/sanctum/csrf-cookie`, { withCredentials: true });
      const response = await axios.get(`${base_url}/api/cardsInDeck/${newDeck.deck_id}`)
      //const response = axios.get(`http://localhost:8000/api/cardsInDeck/${newDeck.deck_id}`)
      cardsInSelectedDeck.value = response.data
      //console.log("Fetched deck details:", response.data)
      // Do something with the response, like storing it in another ref
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
            listOfStoredDecks.value = response.data.map(deckData => ({
                deck_id: deckData.id,
                deck_name: deckData.deck_name,
                description: deckData.description,
            }))
            console.log("Complete return value: " + JSON.stringify(listOfStoredDecks.value));
        }
    } catch (error) {
        console.log("oops an error!");
    }    
}

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
          <v-tab v-for="i in 3" :key="i" :value="i">
            Item {{ i }}
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
        <v-card class="custom-card-background" v-if="tab===1">
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
        <v-card v-if="tab===2">
            <v-autocomplete v-model="selectedDeck" label="Select a Deck" :items="listOfStoredDecks" item-title="deck_name" return-object>
                <template v-slot:item="{ item, props }">
                    <v-list-item v-bind="props">
                    <v-list-item-title>{{ item.deck_name }}</v-list-item-title>
                    <v-list-item-subtitle v-if="item.description">{{ item.description }}</v-list-item-subtitle>
                    </v-list-item>
                </template>
            </v-autocomplete>
            <v-data-table
            :headers="tableHeaders"
            :items="cardsInSelectedDeck"
            class="elevation-1"
            >
                <template v-slot:top>
                    <v-toolbar flat>
                    <v-toolbar-title>Cards in Deck</v-toolbar-title>
                    </v-toolbar>
                </template>
            </v-data-table>            
        </v-card>
        <v-card v-if="tab===3">
          <v-card-text>
            Content for tab {{ i }}
          </v-card-text>
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
</style>
