<script setup lang="ts">
import { computed, onMounted, ref, reactive } from 'vue';
import axios from 'axios';
import Colors from './Colors.vue';
import { getColorManaCost, getNumericalManaCost, mapColorCodeToName} from '@/utils/deckUtils'

import type { MtgCard } from '@/utils/types';
import { useCsvExport, CsvColumn } from '@/composables/useCsvExport';
//import Mana from './Mana.vue';

// From here: https://valgeirb.github.io/vue3-popper/guide/getting-started.html#manually-controlling-the-popper
import Popper from "vue3-popper";

const base_url = "http://localhost:80";
const processedCardData = ref([])
const tableLoadKey = ref(0)
const searchText = ref("")
const itemsPerPage = ref(10)

const setData = ref([])
const selectedSets = ref([])

const limitToRetrieve = ref(100)

const selectedRarity = ref(['common', 'uncommon', 'rare', 'mythic'])
const colorsToggle = ref( {
    plains: false,
    islands: false,
    swamps: false,
    mountains: false,
    forests: false,
    colorless: false,
})

const processedMtgCardData = ref<MtgCard[]>([])

const allHeaders = ref([
    { title: 'Name', value: 'name', width: '300px' },
    { title: 'Set', value: 'set_name', width: '300px' },
    { title: 'Type', value: 'type', width: '300px' },
    { title: 'Colors', value: 'colors' },
    { title: 'Mana Cost', value: 'mana_cost', width: '200px' },
    { title: 'Image', value: 'image_url' },
    { title: 'Text', value: 'card_text', width: '600px' },
])

const csvMtgColumns: CsvColumn<MtgCard>[] = [
  { key: 'name',      label: 'Name'      },
  { key: 'official_set_name',  label: 'Set' },  
  { key: 'type',      label: 'Type'      },
  { key: 'colors',    label: 'Colors'    },
  { key: 'mana_cost', label: 'Mana Cost' },
  { key: 'image_url', label: 'Image URL' },
  { key: 'card_text', label: 'Card Text' }    
]

const { downloadCsv } = useCsvExport<MtgCard>()

function exportTableCsv() {
  if (!processedCardData.value.length) {
    return alert('No data to export')
  }
  downloadCsv(processedCardData, csvMtgColumns, 'cards.csv')
}

const setNameMap = computed<Record<string, string>>(() => 
setData.value.reduce((acc, { value, official_set_name }) => {
    acc[value] = official_set_name
        return acc
    }, {} as Record<string, string>)
)


onMounted(() => {
    getSetDataAsync()
    getCardDataAsync()
})

async function getCardDataAsync() {
    const cardDataResponse = await axios.get(`${base_url}/cardsJSON/40`)
    //cardDataAsync.value.push(...arguments(cardDataResponse.data || []))
    //cardDataAsync.value.cardData = cardDataResponse.data;
    processRawCardData(cardDataResponse.data)
}

async function getSetDataAsync() {
    const setDataResponse = await axios.get(`${base_url}/sets`)
    //cardDataAsync.value.push(...arguments(cardDataResponse.data || []))
    //cardDataAsync.value.cardData = cardDataResponse.data;


    setData.value = setDataResponse.data.map(aSetsData => ({
        value: aSetsData.set_name,
        title: aSetsData.official_set_code + ' (' + aSetsData.set_name + ')',
        official_set_name: aSetsData.official_set_code
    }))
}


function processRawCardData(data) {
    processedCardData.value = data.map(cardDataVal => {
        // grab the raw string once
        const rawCost       = cardDataVal.mana_cost ?? ''
        // compute once up-front
        const mana_numeric  = getNumericalManaCost(rawCost)
        const mana_colors   = getColorManaCost(rawCost)
        return {
            id: cardDataVal.id,
            name: cardDataVal.name,
            set_name: cardDataVal.set_name,
            official_set_name: setNameMap.value[cardDataVal.set_name],
            type: cardDataVal.type,
            colors: convertColorToName(cardDataVal.colorIdentities),
            mana_cost:     rawCost,
            // <-- new pre-computed props
            mana_numeric,   
            mana_colors,              
            image_url: cardDataVal.image_url ?? "",
            card_text: cardDataVal.text
        }   
    })
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

    function toggleColorFilters(colorValue) {
        colorsToggle.value[colorValue] = !colorsToggle.value[colorValue];
    }

    const filteredCardData = computed(() => {
    const activeColors = Object.entries(colorsToggle.value)
        .filter(([_, isActive]) => isActive)
        .map(([key]) => {
        switch (key) {
            case "plains": return "W";
            case "islands": return "U";
            case "swamps": return "B";
            case "mountains": return "R";
            case "forests": return "G";
            case "colorless": return "C";
            default: return null;
        }
        })
        .filter(Boolean);

    // If no filters are active, return everything
    if (activeColors.length === 0) return processedCardData.value;

    // Otherwise, filter by matching card.colors
    return processedCardData.value.filter(card => {
        if (!card.colors) return false;
        const cardColors = Array.isArray(card.colors)
        ? card.colors
        : [card.colors]; // normalize to array

        return cardColors.some(c => activeColors.includes(c));
    });
    });


    const activeColors = computed(() =>
    Object.entries(colorsToggle.value)
        .filter(([_, isActive]) => isActive)
        .map(([key]) => {
        switch (key) {
            case "plains": return "W";
            case "islands": return "U";
            case "swamps": return "B";
            case "mountains": return "R";
            case "forests": return "G";
            case "colorless": return "C";
            default: return null;
        }
        })
        .filter(Boolean)
    );
    
    const colorFilterParam = computed(() => activeColors.value.join(','));

    async function searchByName() {
        if (selectedRarity.value.length === 0) {
            selectedRarity.value = ['common', 'uncommon', 'rare', 'mythic']
        }

        const cardDataResponse = await axios.get(`${base_url}/cards/name/${searchText.value}/rarities/${selectedRarity.value}`, {
            params: {
                limit: limitToRetrieve.value
            }
        });
        processRawCardData(cardDataResponse.data);
    }

    async function searchWithMultipleCriteria() {

        const cardDataResponse = await axios.get(`${base_url}/cardsfromsets/${selectedSets.value[0].value}`, {
            params: {
                limit: limitToRetrieve.value,
                colorFilters: colorsToggle

            }
        });
    }


    async function searchAgainstSetData() {
        if (selectedRarity.value.length === 0) {
            selectedRarity.value = ['common', 'uncommon', 'rare', 'mythic'];
        }

        if (searchText.value.length === 0) {
            const cardDataResponse = await axios.get(`${base_url}/cardsfromsets/${selectedSets.value[0].value}`, {
                params: {
                    limit: limitToRetrieve.value,
                    colorFilters: colorFilterParam.value
                }
            });
            processRawCardData(cardDataResponse.data);
        } else {

            const cardDataResponse = await axios.get(`${base_url}/cardsfromsets/name/${searchText.value}/rarities/${selectedRarity.value}`, {
                params: {
                    limit: limitToRetrieve.value
                }
            });
            processRawCardData(cardDataResponse.data);
        }
    }
 </script>

<template>
    <!--<img src="../../../../data/images/island.svg"></img>-->
    <v-container fluid>
        <v-row>
            <v-btn :class="{ 'bg-primary': colorsToggle['plains']}" size="small" rounded="sm" @click="toggleColorFilters('plains')"><Colors color_name="plains"  /></v-btn>
            <v-btn :class="{ 'bg-primary': colorsToggle['islands']}" size="small" rounded="sm" @click="toggleColorFilters('islands')"><Colors color_name="islands" /></v-btn>
            <v-btn :class="{ 'bg-primary': colorsToggle['swamps']}" size="small" rounded="sm" @click="toggleColorFilters('swamps')"><Colors color_name="swamps" /></v-btn>
            <v-btn :class="{ 'bg-primary': colorsToggle['mountains']}" size="small" rounded="sm" @click="toggleColorFilters('mountains')"><Colors color_name="mountains" /></v-btn>
            <v-btn :class="{ 'bg-primary': colorsToggle['forests']}" size="small" rounded="sm" @click="toggleColorFilters('forests')"><Colors color_name="forests" /></v-btn>
            <v-btn :class="{ 'bg-primary': colorsToggle['colorless']}" size="small" rounded="sm" @click="toggleColorFilters('colorless')"><Colors color_name="colorless" /></v-btn>

            <v-combobox
            v-model="selectedSets"
            clearable
            chips
            multiple
            label="Magic Sets"
            :items="setData"
            item-text="title"
            item-value="value"
            ></v-combobox>
            <v-col>
                <v-row><v-btn @click="searchAgainstSetData" density="compact" color="secondary">Search - Sets</v-btn>  <v-btn color="primary" @click="exportTableCsv">Export CSV</v-btn></v-row>
                <v-row><v-text-field v-model="limitToRetrieve" label="limit"></v-text-field></v-row>
            </v-col>
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
    <v-data-table :headers=allHeaders :items="filteredCardData" :key="tableLoadKey" :items-per-page-options="[ {value: 10, title: '10'}, {value: 20, title: '20'}, { title: 'All', value: -1 }]" :items-per-page.sync="itemsPerPage">
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
        <template v-slot:item.mana_cost="{ item }">
        <div class="card-mana-right">
            <Colors :mana_cost="item.mana_numeric" />
            <span
            v-for="(c, idx) in item.mana_colors"
            :key="idx"
            class="color-symbol"
            >
            <Colors :color_name="mapColorCodeToName(c)" />
            </span>
        </div>
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