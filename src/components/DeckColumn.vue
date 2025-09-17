<script setup lang="ts">
import type { Card, ComparisonItem, Deck } from '@/utils/types'
import { toRefs } from 'vue'
import CardRow from '@/components/CardRow.vue'

const props = defineProps<{
  sharedCardRows: ComparisonItem[]
  index: number
  deck: Deck
}>()
const { sharedCardRows } = toRefs(props)
</script>
<template>
    <v-card class="deck-column-card" outlined>
    <v-card-title>{{ deck.name }}</v-card-title>
    <v-card-subtitle v-if="deck.archetype">{{ deck.archetype }}</v-card-subtitle>
    <v-divider />
    <v-card-text>
        <CardRow
        v-for="(card, i) in sharedCardRows"
        :key="card.name"
        :card="card"
        :count="card[`col${index}`]"
        />
    </v-card-text>
    </v-card>
</template>