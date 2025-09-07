import { createMemoryHistory, createRouter } from 'vue-router'

import CardListingVuetify from './components/CardListingVuetify.vue'
import Decks from './components/Decks.vue'

const routes = [
    { path: '/', component: CardListingVuetify },
    { path: '/decks', component: Decks }
]

const router = createRouter({
    history: createMemoryHistory(),
    routes
})

export default router
