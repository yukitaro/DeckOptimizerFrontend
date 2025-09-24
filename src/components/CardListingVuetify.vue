<script setup lang="ts">
import { computed, onMounted, ref, reactive } from 'vue';
import axios from 'axios';
import Colors from './Colors.vue';
import { getColorManaCost, getNumericalManaCost, mapColorCodeToName} from '../utils/deckUtils'
import type { MtgCard } from '../utils/types';
import { useCsvExport, CsvColumn } from '../composables/useCsvExport';

// Types for our component
interface SetDataItem {
  set_name: string;
  official_set_code: string;
  total_cards: string;
}

interface ProcessedSetData {
  value: string;
  title: string;
  official_set_name: string;
}

interface CardDataFromAPI {
  id: number;
  name: string;
  set_name: string;
  type: string;
  colorIdentities: string;
  mana_cost: string;
  image_url: string;
  text: string;
}

type ColorName = 'plains' | 'islands' | 'swamps' | 'mountains' | 'forests' | 'colorless';

const base_url = "http://localhost:80";
const processedCardData = ref<any[]>([])
const tableLoadKey = ref(0)
const searchText = ref("")
const itemsPerPage = ref(10)

// CSV Export composable
const { downloadCsv } = useCsvExport<any>()

const setData = ref<ProcessedSetData[]>([])
const selectedSets = ref<ProcessedSetData[]>([])

const limitToRetrieve = ref(100)

const selectedRarity = ref(['common', 'uncommon', 'rare', 'mythic'])
const colorsToggle = ref<Record<ColorName, boolean>>({
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

function exportToCSV() {
  if (filteredCardData.value.length === 0) {
    return alert('No data to export')
  }
  
  // Define columns for CSV export
  const columns: CsvColumn<any>[] = [
    { key: 'name', label: 'Name' },
    { key: 'official_set_name', label: 'Set' },
    { key: 'rarity', label: 'Rarity' },
    { key: 'mana_cost', label: 'Mana Cost' },
    { key: 'type_line', label: 'Type' },
    { key: 'oracle_text', label: 'Text' }
  ]
  
  downloadCsv(filteredCardData.value, columns, 'mtg_cards_export.csv')
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
    
    setData.value = setDataResponse.data.map((aSetsData: SetDataItem) => ({
        value: aSetsData.set_name,
        title: aSetsData.official_set_code + ' (' + aSetsData.set_name + ')',
        official_set_name: aSetsData.official_set_code
    }))
}

function processRawCardData(data: CardDataFromAPI[]) {
    processedCardData.value = data.map(cardDataVal => {
        // grab the raw string once
        const rawCost       = cardDataVal.mana_cost ?? ''
        // compute once up-front
        const mana_numeric  = getNumericalManaCost(rawCost)
        const mana_colors   = getColorManaCost(rawCost)

        const letters = Array.isArray(cardDataVal.colorIdentities)
            ? cardDataVal.colorIdentities
            : cardDataVal.colorIdentities
                ? [cardDataVal.colorIdentities]
                : []

    const colors = letters
      .map(l => colorMap[l])
      .filter(Boolean)      // ← important!

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


    function convertColorToName(color: string): ColorName {
        switch (color) {
            case 'W': return 'plains'
            case 'U': return 'islands'
            case 'B': return 'swamps'
            case 'R': return 'mountains'
            case 'G': return 'forests'
            case '':
            case null:
            case undefined:
            default: return 'colorless'
        }
    }

const colorMap: Record<string, ColorName> = {
  W: 'plains', U: 'islands', B: 'swamps', R: 'mountains', G: 'forests', C: 'colorless'
}    

    function toggleColorFilters(colorValue: ColorName) {
        colorsToggle.value[colorValue] = !colorsToggle.value[colorValue];
    }

    const filteredCardData = computed(() => {
    const activeNames = Object.entries(colorsToggle.value)
        .filter(([_, on]) => on)
        .map(([name]) => name)

    // If no filters are active, return everything
    if (activeNames.length === 0) return processedCardData.value;

    // Otherwise, filter by matching card.colors
    return processedCardData.value.filter(card => {
        return card.colors && activeNames.includes(card.colors);
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

    // Color counts for current results (for badges and visual indicators)
    const colorCounts = computed(() => {
        const counts = { plains: 0, islands: 0, swamps: 0, mountains: 0, forests: 0, colorless: 0 }
        
        processedCardData.value.forEach((card: any) => {
            if (card.colors) {
                const cardColors = Array.isArray(card.colors) ? card.colors : [card.colors]
                cardColors.forEach((color: string) => {
                    // Convert color codes back to names for counting
                    const colorName = convertColorCodeToName(color)
                    if (colorName && counts.hasOwnProperty(colorName)) {
                        counts[colorName as keyof typeof counts]++
                    }
                })
            }
        })
        return counts
    })

    function convertColorCodeToName(colorCode: string): string | null {
        switch (colorCode) {
            case 'W': return 'plains'
            case 'U': return 'islands'
            case 'B': return 'swamps'
            case 'R': return 'mountains'
            case 'G': return 'forests'
            case '':
            case null:
            case undefined: return 'colorless'
            default: return null
        }
    }

    function hasColorInResults(colorName: string): boolean {
        return colorCounts.value[colorName as keyof typeof colorCounts.value] > 0
    }

    function getColorCount(colorName: string): number {
        return colorCounts.value[colorName as keyof typeof colorCounts.value] || 0
    }

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
            <v-btn 
                :class="{ 
                    'bg-primary': colorsToggle['plains'],
                    'color-unavailable': !hasColorInResults('plains') && getColorCount('plains') === 0
                }" 
                size="small" 
                rounded="sm" 
                @click="toggleColorFilters('plains')"
            >
                <Colors color_name="plains" />
                <v-badge 
                    v-if="getColorCount('plains') > 0" 
                    :content="getColorCount('plains')" 
                    color="success"
                    offset-x="10"
                    offset-y="10"
                />
            </v-btn>
            <v-btn 
                :class="{ 
                    'bg-primary': colorsToggle['islands'],
                    'color-unavailable': !hasColorInResults('islands') && getColorCount('islands') === 0
                }" 
                size="small" 
                rounded="sm" 
                @click="toggleColorFilters('islands')"
            >
                <Colors color_name="islands" />
                <v-badge 
                    v-if="getColorCount('islands') > 0" 
                    :content="getColorCount('islands')" 
                    color="success"
                    offset-x="10"
                    offset-y="10"
                />
            </v-btn>
            <v-btn 
                :class="{ 
                    'bg-primary': colorsToggle['swamps'],
                    'color-unavailable': !hasColorInResults('swamps') && getColorCount('swamps') === 0
                }" 
                size="small" 
                rounded="sm" 
                @click="toggleColorFilters('swamps')"
            >
                <Colors color_name="swamps" />
                <v-badge 
                    v-if="getColorCount('swamps') > 0" 
                    :content="getColorCount('swamps')" 
                    color="success"
                    offset-x="10"
                    offset-y="10"
                />
            </v-btn>
            <v-btn 
                :class="{ 
                    'bg-primary': colorsToggle['mountains'],
                    'color-unavailable': !hasColorInResults('mountains') && getColorCount('mountains') === 0
                }" 
                size="small" 
                rounded="sm" 
                @click="toggleColorFilters('mountains')"
            >
                <Colors color_name="mountains" />
                <v-badge 
                    v-if="getColorCount('mountains') > 0" 
                    :content="getColorCount('mountains')" 
                    color="success"
                    offset-x="10"
                    offset-y="10"
                />
            </v-btn>
            <v-btn 
                :class="{ 
                    'bg-primary': colorsToggle['forests'],
                    'color-unavailable': !hasColorInResults('forests') && getColorCount('forests') === 0
                }" 
                size="small" 
                rounded="sm" 
                @click="toggleColorFilters('forests')"
            >
                <Colors color_name="forests" />
                <v-badge 
                    v-if="getColorCount('forests') > 0" 
                    :content="getColorCount('forests')" 
                    color="success"
                    offset-x="10"
                    offset-y="10"
                />
            </v-btn>
            <v-btn 
                :class="{ 
                    'bg-primary': colorsToggle['colorless'],
                    'color-unavailable': !hasColorInResults('colorless') && getColorCount('colorless') === 0
                }" 
                size="small" 
                rounded="sm" 
                @click="toggleColorFilters('colorless')"
            >
                <Colors color_name="colorless" />
                <v-badge 
                    v-if="getColorCount('colorless') > 0" 
                    :content="getColorCount('colorless')" 
                    color="success"
                    offset-x="10"
                    offset-y="10"
                />
            </v-btn>

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
                <v-row><v-btn @click="searchAgainstSetData" density="compact" color="secondary">Search - Sets</v-btn>  <v-btn color="primary" @click="exportToCSV">Export CSV</v-btn></v-row>
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
            <div class="d-flex"> <Colors v-for="(name, idx) in item.colors" :key="idx" :color_name="name" /> </div>
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

/* Color filter button styles */
.color-unavailable {
  opacity: 0.4 !important;
  filter: grayscale(0.7);
}

.color-unavailable:hover {
  opacity: 0.6 !important;
  filter: grayscale(0.5);
}

/* Override Vuetify badge positioning for better visibility */
:deep(.v-badge__wrapper) {
  position: relative;
}

:deep(.v-badge__badge) {
  font-size: 0.75rem;
  min-width: 18px;
  height: 18px;
}
</style>