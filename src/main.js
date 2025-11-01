import { createApp } from 'vue'
import { registerPlugins } from '@/plugins'
import { useAuth } from '@/composables/useAuth'
import { laravel_api } from '@/api/client'

import App from './App.vue'
import Popper from "vue3-popper"
import router from './router'

// Styles
import 'unfonts.css'


import { brokenImageTracker } from '@/utils/brokenImageTracker';

window.brokenImageTracker = brokenImageTracker;

const token = localStorage.getItem('authToken')
const app = createApp(App)

registerPlugins(app)

if (token) {
  laravel_api.defaults.headers.common.Authorization = `Bearer ${token}`
  const { fetchUser } = useAuth()
  fetchUser().catch(() => {
    localStorage.removeItem('authToken')
    delete laravel_api.defaults.headers.common.Authorization
  })
}


app.component("Popper", Popper)
app.use(router)
app.mount('#app')
