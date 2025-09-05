<script setup>
import { nextTick, onMounted, ref, reactive } from 'vue';
import axios from 'axios';
import Colors from './Colors.vue';
//import Mana from './Mana.vue';

// From here: https://valgeirb.github.io/vue3-popper/guide/getting-started.html#manually-controlling-the-popper
import Popper from "vue3-popper";

const count = ref(0)
const base_url = "http://localhost:80";
const cardData = ref()
const cardDataAsync = ref([])
const processedCardData = ref([])
const tableLoadKey = ref(0)
const searchText = ref("")
const itemsPerPage = ref(10)
//const initialLoadComplete = ref(false)

onMounted(() => {
    getCardDataAsync()
    //initialLoadComplete = true
    //getCardData()
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

/* export default {
    data() {
        return {
            cardData: [],
        }
    },
   methods: {
        getCardData(){
            axios
                .get(`${base_url}'/cards/30`)
                .then(response => {this.cardData = response.data.matchingCards})
        }
   },
}
 */

    function processRawCardData(data) {
        processedCardData.value = data.map(cardDataVal => ({
            id: cardDataVal.id,
            name: cardDataVal.name,
            set_name: cardDataVal.set_name,
            type: cardDataVal.type,
            colors: convertColorToName(cardDataVal.colors),
            mana_cost: cardDataVal.mana_cost,
            image_url: cardDataVal.image_url ?? ""
        }))
    }


    function convertColorToName(color) {
        switch (color) {
            case '[\'W\']':
                return 'plains'
            case '[\'U\']':
                return 'islands'
            case '[\'B\']':
                return 'swamps'
            case '[\'R\']':
                return 'mountains'
            case '[\'G\']':
                return 'forests'
            case '{W}':
                return 'plains'
            default:
                break;
        }
    }

    async function filterByColor(colorValue) {
        const cardDataResponse = await axios.get(`${base_url}/cardsJSON/40/${colorValue}`)
        processRawCardData(cardDataResponse.data);
    }


    async function searchByName() {
        const cardDataResponse = await axios.get(`${base_url}/cards/name/${searchText.value}/40`)
        processRawCardData(cardDataResponse.data);
    }

 </script>

<template>
    <!--<img src="../../../../data/images/island.svg"></img>-->
    <v-btn size="small" rounded="sm" @click="filterByColor('plains')"><Colors color_name="plains" :colors="plains" /></v-btn>
    <v-btn size="small" rounded="sm" @click="filterByColor('islands')"><Colors color_name="islands" :colors="islands"/></v-btn>
    <v-btn size="small" rounded="sm" @click="filterByColor('swamps')"><Colors color_name="swamps" :colors="swamps"/></v-btn>
    <v-btn size="small" rounded="sm" @click="filterByColor('mountains')"><Colors color_name="mountains" :colors="mountains"/></v-btn>
    <v-btn size="small" rounded="sm" @click="filterByColor('forests')"><Colors color_name="forests" :colors="forests"/></v-btn>
    <v-btn size="small" rounded="sm" @click="filterByColor('colorless')"><Colors color_name="colorless" :colors="forests"/></v-btn>
    <v-text-field
        label="Search"
        v-model="searchText"
        @keyup.enter="searchByName"
    ></v-text-field>    
    <div>
        <v-data-table :items="processedCardData" :key="tableLoadKey" :items-per-page-options="[ {value: 10, title: '10'}, {value: 20, title: '20'}, { title: 'All', value: -1 }]" :items-per-page.sync="itemsPerPage">
            <template v-slot:item.image_url="{ item }">
                <!--<a :href="item.image_url" target="_blank">image</a> -->
                <Popper hover arrow placement="left">
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