import { createWebHistory, createRouter } from 'vue-router'

import CardListingVuetify from './components/CardListingVuetify.vue'
import Decks from './components/Decks.vue'
import Collections from './components/Collections.vue'
import Settings from './components/Settings.vue'
import AdminConsole from './components/AdminConsole.vue'
import DataCoverageDashboard from './components/DataCoverageDashboard.vue'
import ImageCoverageDashboard from './components/ImageCoverageDashboard.vue'
import ImportCandidatesDashboard from './components/ImportCandidatesDashboard.vue'
import MtgSetDataDashboard from './components/MtgSetDataDashboard.vue'
import CardMetadataDashboard from './components/CardMetadataDashboard.vue'
import Login from './components/Login.vue'

import { useAuth } from '@/composables/useAuth'

const { user, fetchUser } = useAuth()

const routes = [
    { path: '/', component: CardListingVuetify },
    { path: '/decks', component: Decks },
    { path: '/decks/:deckId?', name: 'Decks', component: Decks, props: true },
    { path: '/collections', component: Collections },
    { path: '/settings', component: Settings },
    { path: '/adminconsole', component: AdminConsole, meta: { requiresAuth: true } },
    { path: '/adminconsole/image-coverage', component: ImageCoverageDashboard, meta: { requiresAuth: true } },
    { path: '/adminconsole/data-coverage', component: DataCoverageDashboard, meta: { requiresAuth: true } },
    { path: '/importcandidates', component: ImportCandidatesDashboard, meta: { requiresAuth: true } },
    { path: '/magicsetdata', component: MtgSetDataDashboard, meta: { requiresAuth: true } },
    { path: '/cardmetadata', component: CardMetadataDashboard, meta: { requiresAuth: true } },
    { path: '/login', component: Login }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})


const shouldCallBackend = Boolean(import.meta.env.VITE_ENABLE_AUTH === 'true');

router.beforeEach(async (to, from, next) => {
  if (!shouldCallBackend) {
    return next()
  }

  const { user, fetchUser } = useAuth()

  if (!user.value) await fetchUser()

  if (to.meta.requiresAuth && !user.value) {
    return next('/login') // redirect to login
  }

  next()
})


export default router
