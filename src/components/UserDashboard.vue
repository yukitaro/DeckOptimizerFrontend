<script setup>
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const $route = useRoute()
const { user, fetchUser } = useAuth()

// Optional: fetch user on mount if needed
if (!user.value) {
  fetchUser()
}

const toggleDashboard = () => {
  // You can route to /user-dashboard or open a dropdown/modal
  window.location.href = '/user-dashboard'
}
</script>

<template>
  <div v-if="!user">
    <button @click="redirectToLogin">Login</button>
  </div>
  <div v-else>
    <button @click="toggleDashboard">{{ user.alias }}</button>
  </div>
</template>

