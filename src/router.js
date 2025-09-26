import { createMemoryHistory, createRouter } from 'vue-router'

import CardListingVuetify from './components/CardListingVuetify.vue'
import Decks from './components/Decks.vue'
import Collections from './components/Collections.vue'


const routes = [
    { path: '/', component: CardListingVuetify },
    { path: '/decks', component: Decks },
    { path: '/collections', component: Collections }
]

const router = createRouter({
    history: createMemoryHistory(),
    routes
})

export default router
