<script setup>
import { computed, ref } from 'vue'
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
const csrf_token = ref('')

const search = computed({
  get() {
    return route.query.search ?? ''
  },
  set(search) {
    router.replace({ query: { search } })
  }
})

async function importCardsForDeck() {


    axios.defaults.withCredentials = true;
    axios.defaults.withXSRFToken = true;

    if (csrf_token.value.length === 0) {
        csrf_token.value = await axios.get(`${base_url}/token`)
    }

    const customHeaders = {
        'Content-Type': 'application/json', // Common header for JSON data
        'Authorization': 'Bearer $csrf_token', // Example for authentication
    }

    //console.log('deck values' + deckSomething.value);
    console.log('headers' + customHeaders);
    try {
        await axios.post(`${base_url}/deck`, {
            deckName: deckName.value,
            deckDescription: deckDescription.value,
            deckData: deckSomething.value,
            deckLink: externalLink.value
        }, customHeaders)
        .then((response) => console.log(response))
    } catch(error) {
            console.log(response)
    }

}
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
        <v-card v-if="tab===1" color="blue-darken-4">
          <v-card-text>
                <v-form v-model="valid">
                    <v-row gutters>
                        <v-col cols="7">
                            <v-row>
                                <v-col cols="2">
                                    <v-btn @click="importCardsForDeck" class="mt-2" type="button" block>Import</v-btn>                
                                </v-col>                            
                                <v-col cols="4">
                                <v-text-field
                                    v-model="deckName"
                                    label="Deck name"
                                    required
                                ></v-text-field>
                                </v-col>
                                <v-col cols="6">
                                <v-text-field
                                    v-model="deckDescription"
                                    label="Deck description"
                                    required
                                ></v-text-field>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col cols="12">
                                <v-text-field
                                    v-model="externalLink"
                                    label="Link to deck"
                                    required
                                ></v-text-field>
                                </v-col>
                            </v-row>
                        </v-col>
                        <v-col cols="5">
                            <v-textarea
                                v-model="deckSomething"
                                label="Deck something"
                                rows="40"
                                row-height="25"
                                color=""
                            ></v-textarea>
                        </v-col>
                    </v-row>                    
                </v-form>
          </v-card-text>
        </v-card>
        <v-card v-if="tab===2">
          <v-card-text>
            Content for tab 2
          </v-card-text>
        </v-card>
        <v-card v-if="tab===3">
          <v-card-text>
            Content for tab {{ i }}
          </v-card-text>
        </v-card>
    </v-window>
  </v-card>
</template>