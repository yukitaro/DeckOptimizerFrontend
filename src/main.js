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

// Styles
//import 'unfonts.css'
import './style.css'

const app = createApp(App)

registerPlugins(app)

app.component("Popper", Popper)
app.mount('#app')
