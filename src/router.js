import { createMemoryHistory, createRouter } from 'vue-router'

import CardListingVuetify from './components/CardListingVuetify.vue'
import Decks from './components/Decks.vue'
import Collections from './components/Collections.vue'
import Settings from './components/Settings.vue'
import AdminConsole from './components/AdminConsole.vue'
import DataCoverageDashboard from './components/DataCoverageDashboard.vue'
import ImageCoverageDashboard from './components/ImageCoverageDashboard.vue'
import ImportCandidatesDashboard from './components/ImportCandidatesDashboard.vue'
import MtgSetDataDashboard from './components/MtgSetDataDashboard.vue'

const routes = [
    { path: '/', component: CardListingVuetify },
    { path: '/decks', component: Decks },
    { path: '/collections', component: Collections },
    { path: '/settings', component: Settings },
    { path: '/adminconsole', component: AdminConsole, meta: { requiresAuth: true } },
    { path: '/adminconsole/image-coverage', component: ImageCoverageDashboard, meta: { requiresAuth: true } },
    { path: '/adminconsole/data-coverage', component: DataCoverageDashboard, meta: { requiresAuth: true } },
    { path: '/importcandidates', component: ImportCandidatesDashboard, meta: { requiresAuth: true } },
    { path: '/magicsetdata', component: MtgSetDataDashboard, meta: { requiresAuth: true } }
    
]

const router = createRouter({
    history: createMemoryHistory(),
    routes
})

export default router
