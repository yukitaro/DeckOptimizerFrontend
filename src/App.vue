<template>
  <v-app>
    <!-- Main App Bar -->
    <v-app-bar
      :elevation="0"
      class="app-bar-glass"
      height="80"
    >
      <div class="app-bar-content">
        <!-- App Title/Logo -->
        <div class="app-title">
          <v-icon icon="mdi-cards-variant" size="32" color="primary" class="mr-3"></v-icon>
          <h1 class="text-h5 font-weight-bold text-primary">Deck Optimizer</h1>
        </div>

        <!-- Navigation -->
        <div class="app-navigation">
          <v-btn :to="'/'" :variant="$route.path === '/' ? 'elevated' : 'text'"
            :color="$route.path === '/' ? 'primary' : 'default'" size="large" class="nav-btn mr-3"
            prepend-icon="mdi-magnify">
            Search
          </v-btn>
          
          <v-btn :to="'/decks'" :variant="$route.path === '/decks' ? 'elevated' : 'text'"
            :color="$route.path === '/decks' ? 'primary' : 'default'" size="large"
            class="nav-btn" prepend-icon="mdi-cards-variant">
            Decks
          </v-btn>

          <v-btn :to="'/collections'" :variant="$route.path === '/collections' ? 'elevated' : 'text'"
            :color="$route.path === '/collections' ? 'primary' : 'default'" size="large"
            class="nav-btn" prepend-icon="mdi-archive">
            Collection
          </v-btn>

          <v-btn :to="'/settings'"
            :variant="$route.path === '/settings' ? 'elevated' : 'text'"
            :color="$route.path === '/settings' ? 'primary' : 'default'"
            size="large"
            class="nav-btn"
            prepend-icon="mdi-cog">
            Settings
          </v-btn>          
        </div>
      </div>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="main-content">
      <div class="page-container">
        <RouterView />
      </div>
    </v-main>

    <AppFooter />
  </v-app>
</template>

<script setup>
import { useRoute } from 'vue-router'
import AppFooter from './components/AppFooter.vue'

const $route = useRoute()
</script>

<style scoped>
/* Glassmorphism App Bar */
.app-bar-glass {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%) !important;
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* App Bar Layout */
.app-bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 0 auto;
  padding: 0 48px;
}

.app-title {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.app-navigation {
  display: flex;
  align-items: center;
}

/* Navigation Buttons */
.nav-btn {
  border-radius: 12px !important;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

/* Main Content */
.main-content {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: calc(100vh - 80px);
}

.page-container {
  margin: 0 auto;
  padding: 24px 48px;
}

@media (min-width: 1920px) {
  .app-bar-content {
    padding: 0 64px;
  }
  
  .page-container {
    padding: 24px 64px;
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .app-bar-content {
    padding: 0 16px;
  }
  
  .app-title h1 {
    font-size: 1.25rem !important;
  }
  
  .app-navigation {
    gap: 8px;
  }
  
  .nav-btn {
    min-width: 80px !important;
    padding: 0 12px !important;
  }
  
  .page-container {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .app-title {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .app-title h1 {
    font-size: 1.1rem !important;
    margin-left: -4px;
  }
}
</style>