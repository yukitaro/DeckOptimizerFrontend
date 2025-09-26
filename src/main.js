/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

import Popper from "vue3-popper"

import router from './router'

// Styles
import 'unfonts.css'


import { brokenImageTracker } from '@/utils/brokenImageTracker';

window.brokenImageTracker = brokenImageTracker;

const app = createApp(App)

registerPlugins(app)

app.component("Popper", Popper)
app.use(router)
app.mount('#app')
