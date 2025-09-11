<script setup>
import { computed, onMounted, ref, reactive } from 'vue';
import axios from 'axios';
import Colors from './Colors.vue';
//import Mana from './Mana.vue';

// From here: https://valgeirb.github.io/vue3-popper/guide/getting-started.html#manually-controlling-the-popper
import Popper from "vue3-popper";

const base_url = "http://localhost:80";
const processedCardData = ref([])
const tableLoadKey = ref(0)
const searchText = ref("")
const itemsPerPage = ref(10)
//const initialLoadComplete = ref(false)
const selectedRarity = ref(['common', 'uncommon', 'rare', 'mythic'])
const colorsToggle = ref( {
    plains: '',
    islands: '',
    swamps: '',
    mountains: '',
    forests: '',
    colorless: '',
})

const allHeaders = ref([
    { title: 'Name', value: 'name', width: '300px' },
    { title: 'Set', value: 'set_name', width: '300px' },
    { title: 'Type', value: 'type', width: '300px' },
    { title: 'Colors', value: 'colors' },
    { title: 'Mana Cost', value: 'mana_cost', width: '200px' },
    { title: 'Image', value: 'image_url' },
    { title: 'Text', value: 'card_text', width: '600px' },
])

onMounted(() => {
    getCardDataAsync()
})

function getCardData() {
            axios
                .get(`${base_url}/cardsJSON/40`)
                .then(response => {cardData = response.data.matchingCards})
}

async function getCardDataAsync() {
    const cardDataResponse = await axios.get(`${base_url}/cardsJSON/40`)
    //cardDataAsync.value.push(...arguments(cardDataResponse.data || []))
    //cardDataAsync.value.cardData = cardDataResponse.data;
    processRawCardData(cardDataResponse.data)
}

    function processRawCardData(data) {
        processedCardData.value = data.map(cardDataVal => ({
            id: cardDataVal.id,
            name: cardDataVal.name,
            set_name: cardDataVal.set_name,
            type: cardDataVal.type,
            colors: convertColorToName(cardDataVal.colorIdentities),
            mana_cost: cardDataVal.mana_cost,
            image_url: cardDataVal.image_url ?? "",
            card_text: cardDataVal.text
        }))
    }


    function convertColorToName(color) {
        switch (color) {
            case 'W':
                return 'plains'
            case 'U':
                return 'islands'
            case 'B':
                return 'swamps'
            case 'R':
                return 'mountains'
            case 'G':
                return 'forests'
            default:
                break;
        }
    }

    async function filterByColor(colorValue) {
        const cardDataResponse = await axios.get(`${base_url}/cardsJSON/40/${colorValue}`)
        processRawCardData(cardDataResponse.data);
    }

    function toggleColorFilters(colorValue) {
        colorsToggle.value[colorValue] = colorsToggle.value[colorValue] === '' ? 'bg-primary' : '';
    }

    async function searchByName() {
        if (selectedRarity.value.length === 0) {
            selectedRarity.value = "common, uncommon, rare, mythic";
        }

        const cardDataResponse = await axios.get(`${base_url}/cards/name/${searchText.value}/rarities/${selectedRarity.value}`, {
            params: {
                limit: 100
            }
        });
        processRawCardData(cardDataResponse.data);
    }

    async function searchAgainstSetData() {
        if (selectedRarity.value.length === 0) {
            selectedRarity.value = "common, uncommon, rare, mythic";
        }

        const cardDataResponse = await axios.get(`${base_url}/cardsfromsets/name/${searchText.value}/rarities/${selectedRarity.value}`, {
            params: {
                limit: 100
            }
        });
        processRawCardData(cardDataResponse.data);
    }


 </script>

<template>
    <!--<img src="../../../../data/images/island.svg"></img>-->
    <v-container fluid>
        <v-row>
            <v-btn :class="colorsToggle['plains']" size="small" rounded="sm" @click="toggleColorFilters('plains')"><Colors color_name="plains"  /></v-btn>
            <v-btn :class="colorsToggle['islands']" size="small" rounded="sm" @click="toggleColorFilters('islands')"><Colors color_name="islands" /></v-btn>
            <v-btn :class="colorsToggle['swamps']" size="small" rounded="sm" @click="toggleColorFilters('swamps')"><Colors color_name="swamps" /></v-btn>
            <v-btn :class="colorsToggle['mountains']" size="small" rounded="sm" @click="toggleColorFilters('mountains')"><Colors color_name="mountains" /></v-btn>
            <v-btn :class="colorsToggle['forests']" size="small" rounded="sm" @click="toggleColorFilters('forests')"><Colors color_name="forests" /></v-btn>
            <v-btn :class="colorsToggle['colorless']" size="small" rounded="sm" @click="toggleColorFilters('colorless')"><Colors color_name="colorless" /></v-btn>
            <v-btn @click="searchAgainstSetData" density="compact" color="secondary">Search - Sets</v-btn>
        </v-row>
        <v-row>
            <v-checkbox v-model="selectedRarity"
                label="Common" value="common" hide-details>
            </v-checkbox>
            <v-checkbox v-model="selectedRarity"
                label="Uncommon" value="uncommon" hide-details>
            </v-checkbox>
            <v-checkbox v-model="selectedRarity"
                label="Rare" value="rare" hide-details>
            </v-checkbox>
            <v-checkbox v-model="selectedRarity"
                label="Mythic" value="mythic" hide-details>
            </v-checkbox>
        </v-row>
    </v-container>
    <v-text-field
        label="Search"
        v-model="searchText"
        @keyup.enter="searchByName"
    ></v-text-field>    
    <div>
        <v-data-table :headers=allHeaders :items="processedCardData" :key="tableLoadKey" :items-per-page-options="[ {value: 10, title: '10'}, {value: 20, title: '20'}, { title: 'All', value: -1 }]" :items-per-page.sync="itemsPerPage">
            <template v-slot:item.image_url="{ item }">
                <!--<a :href="item.image_url" target="_blank">image</a> -->
                <Popper hover arrow placement="right">
                    <!-- Trigger slot: The element you hover over -->
                    <v-img :src="item.image_url" alt="Thumbnail" class="trigger-image" />
                    <!-- Content slot: The popover content -->
                    <template #content>
                        <div class="popover-content">
                            <img :src="item.image_url" alt="Full size" />
                        </div>
                    </template>
                </Popper>
            </template>
            <template v-slot:item.colors="{ item }">
                <Colors :color_name="item.colors" />
            </template>
        </v-data-table>
    </div>
</template>

<style scoped>
    table {
        width: 100%;
        border-collapse: collapse;
    }

    th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
    }

    th {
        background-color: #f2f2f2;
    }

/* Scoped styles for this component */
.trigger-image {
  width: 60px; /* Adjust size as needed */
  cursor: pointer;
}

.popover-content {
  padding: 10px;
}

.popover-content img {
  max-width: 300px; /* Adjust size of popover image */
  height: auto;
}    
</style>