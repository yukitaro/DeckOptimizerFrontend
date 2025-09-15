<script setup>
import { computed, ref, toRefs, watch} from 'vue'
import Colors from './Colors.vue';
import { getColorManaCost, getNumericalManaCost, mapColorCodeToName } from '@/utils/deckUtils';
//import { cardsInSelectedDeck } from useDeckData
import { useDeckData } from '@/composables/useDeckData';

const props = defineProps({
    hoveredCard: Object
})
 
//const { cardsInSelectedDeck } = toRefs(props)
const { cardsInSelectedDeck } = useDeckData()
//const hoveredCard = props.hoveredCard //toRefs(props)
const emit = defineEmits(['update:hovered-card'])

const typeHierarchy = ['Creature', 'Artifact', 'Instant', 'Sorcery', 'Enchantment', 'Land'];

const groupedCards = computed(() => {
console.log('Grouping cards:', cardsInSelectedDeck.value)
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

watch(cardsInSelectedDeck, (newSelectedDeck) => {
  console.log('cardsInSelectedDeck changed:', newSelectedDeck)
})

function onHover(card) {
  emit('update:hoveredCard', card)
}
</script>

<template>
    <div class="card-list">
        <div v-for="type in typeHierarchy" :key="type">
            <h3>{{ type }}</h3>
            <div v-if="groupedCards[type].length">
            <div v-for="card in groupedCards[type]" :key="card.id" class="card-line">
                <p>
                <strong>{{ card.card_count }}x</strong>
                <!-- hover only on name -->
                <span class="card-name" @mouseover="onHover(card)">{{ card.name }}</span>
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
</template>

