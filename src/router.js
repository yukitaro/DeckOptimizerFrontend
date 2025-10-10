import { createMemoryHistory, createRouter } from 'vue-router'

import CardListingVuetify from './components/CardListingVuetify.vue'
import Decks from './components/Decks.vue'
import Collections from './components/Collections.vue'
import Settings from './components/Settings.vue'
import AdminConsole from './components/AdminConsole.vue'


const routes = [
    { path: '/', component: CardListingVuetify },
    { path: '/decks', component: Decks },
    { path: '/collections', component: Collections },
    { path: '/settings', component: Settings },
    { path: '/adminconsole', component: AdminConsole, meta: { requiresAuth: true } }
]

const router = createRouter({
    history: createMemoryHistory(),
    routes
})

export default router
