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
import Register from './components/Register.vue'
import ForgotAccountInfo from './components/ForgotAccountInfo.vue'
import ResetPassword from './components/ResetPassword.vue'
import UserDashboard from './components/UserDashboard.vue'
import AdminRoles from './components/AdminRoles.vue'
import RolePermissions from './components/RolePermissions.vue'
import { featureGrants } from '@/config/featureGrants'

import { useAuth } from '@/composables/useAuth'

const authRoutes = [
  {
    path: '/adminconsole',
    component: AdminConsole,
    meta: { feature: 'adminConsole' },
  },
  {
    path: '/adminconsole/roles',
    component: AdminRoles,
    meta: { feature: 'roleManagement' },
  },
  {
    path: '/adminconsole/role-permissions',
    component: RolePermissions,
    meta: { feature: 'permissionMatrix' },
  },
  {
    path: '/importcandidates',
    component: ImportCandidatesDashboard,
    meta: { feature: 'mtgImport' },
  },
  {
    path: '/magicsetdata',
    component: MtgSetDataDashboard,
    meta: { feature: 'mtgSetData' },
  },
  {
    path: '/cardmetadata',
    component: CardMetadataDashboard,
    meta: { feature: 'cardMetadata' },
    props: route => ({
      cardId: route.query.cardId || null,
      cardSet: route.query.cardSet || null,
      cardSlug: route.query.cardSlug || null,
      cardNumberInSet: route.query.cardNumberInSet || null,
    }),
  },
  {
    path: '/user-dashboard',
    component: UserDashboard,
  },
].map(route => ({
  ...route,
  meta: { ...(route.meta || {}), requiresAuth: true },
}))

const routes = [
  { path: '/', component: CardListingVuetify },
  { path: '/decks', component: Decks },
  { path: '/decks/:deckId?', name: 'Decks', component: Decks, props: true },
  { path: '/collections', component: Collections },
  { path: '/settings', component: Settings },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/forgot-account', component: ForgotAccountInfo },
  { path: '/reset-password', component: ResetPassword },
  ...authRoutes,
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

const shouldCallBackend = Boolean(import.meta.env.VITE_ENABLE_AUTH === 'true');

router.beforeEach(async (to, from, next) => {
  if (!shouldCallBackend) return next()

  const { user, fetchUser } = useAuth()
  const { canAccess } = useAccessControl()

  if (!user.value) await fetchUser()

  if (to.meta.requiresAuth && !user.value) {
    return next('/login')
  }

  if (to.meta.feature && !canAccess(to.meta.feature)) {
    return next('/unauthorized')
  }

  next()
})



export default router
