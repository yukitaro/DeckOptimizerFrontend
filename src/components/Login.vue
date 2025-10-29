<script setup>
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const { login } = useAuth()
const router = useRouter()

async function handleLogin() {
  await login(email.value, password.value)
  router.push('/settings') // or wherever you want to land
}
</script>

<template>
  <v-form @submit.prevent="handleLogin">
    <v-text-field v-model="email" label="Email" />
    <v-text-field v-model="password" label="Password" type="password" />
    <v-btn type="submit">Login</v-btn>
  </v-form>
</template>

