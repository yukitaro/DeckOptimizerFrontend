<script setup>
import { nextTick, onMounted, ref, reactive } from 'vue';
import axios from 'axios';
import Colors from './Colors.vue';

const count = ref(0)
const base_url = "http://localhost:80";
const cardData = ref()
const cardDataAsync = ref([])
const processedCardData = ref([])
const initialLoadComplete = ref(false)
const tableLoadKey = ref(0);

onMounted(() => {
    getCardDataAsync()
    initialLoadComplete = true
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
    cardDataAsync.value.cardData = cardDataResponse.data;
    processRawCardData()
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

    function processRawCardData() {
        cardDataAsync.value.cardData.forEach((cardDataVal, index) => {
            processedCardData.value.push({
                id: cardDataVal.id,
                name: cardDataVal.name,
                set_name: cardDataVal.set_name,
                type: cardDataVal.type,
                colors: convertColorToName(cardDataVal.colors),
                mana_cost: cardDataVal.mana_cost
            })
        });
    };

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
            case '{W}':
                return 'plains'
            default:
                break;
        }
    }

    async function filterByColor(colorValue) {
        console.log('filter by ' + colorValue + '!!!\n');
        const cardDataResponse = await axios.get(`${base_url}/cardsJSON/40/${colorValue}`)
        //cardDataAsync.value.push(...arguments(cardDataResponse.data || []))
        cardDataAsync.value.cardData = cardDataResponse.data;
        processedCardData.value = [];
        processRawCardData();
        tableLoadKey.value += 1;
    }

 </script>

<template>
    <button @click="getCardDataAsync">You clicked me {{ count }} times.</button>
    <!--<img src="../../../../data/images/island.svg"></img>-->
    <v-btn size="small" rounded="sm" @click="filterByColor('plains')"><Colors :name="plains"/></v-btn>
    <v-btn size="small" rounded="sm" @click="filterByColor('islands')"><Colors :name="islands"/></v-btn>
    <v-btn size="small" rounded="sm" @click="filterByColor('swamps')"><Colors :name="swamps"/></v-btn>
    <div v-if="initialLoadComplete">Loading Card Data</div>
    <div v-else>
        <v-data-table :items="processedCardData" :key="tableLoadKey">
            <template v-slot:item.colors ="{ item }">
                <Colors :name="item.colors" />
            </template>
        </v-data-table>
    </div>
<!--    <table>
        <thead>
            <tr>
                <th scope="col">Card Name</th>
                <th scope="col">Set Name</th>
                <th scope="col">Type</th>
                <th scope="col">Mana Cost</th>
                <th scope="col">Colors</th>
                <th scope="col">Text</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="card in cardDataAsync?.value.cardData" :key="card.card_multiverse_id">
                <td><a href="{{$card->image_url}}">{{card.name}}</a></td>
                <td>{{card.set_name}}</td>
                <td>{{card.type}}</td>
                <td>{{card.mana_cost}}</td>
                <td>{{card.colors}}</td>
                <td>{{card.text}}</td>            
            </tr>
        </tbody>
    </table> -->
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
</style>