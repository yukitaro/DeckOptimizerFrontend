<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { loginAPI } from '@/api/auth'
import { laravel_api } from '@/api/client'

const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

const router = useRouter()
const { setUser } = useAuth()

const login = async () => {
  if (isSubmitting.value) return
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    const response = await loginAPI(email.value, password.value)

    const token = response.data.token
    localStorage.setItem('authToken', token)
    laravel_api.defaults.headers.common.Authorization = `Bearer ${token}`
    
    setUser(response.data.user)
    router.push({ path: '/' })
  } catch (error: any) {
    const message =
      error?.response?.data?.message ??
      error?.message ??
      'Login failed. Please try again.'
    errorMessage.value = message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card elevation="8">
          <v-toolbar color="primary" dark>
            <v-toolbar-title>Sign in to DeckOptimizer</v-toolbar-title>
          </v-toolbar>

          <v-card-text>
            <v-form @submit.prevent="login">
              <v-text-field
                v-model="email"
                label="Email address"
                type="email"
                autocomplete="email"
                prepend-inner-icon="mdi-email-outline"
                :disabled="isSubmitting"
                required
              />

              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                autocomplete="current-password"
                prepend-inner-icon="mdi-lock-outline"
                :disabled="isSubmitting"
                required
              />

              <div class="text-caption mb-4">
                Need an invite?
                <RouterLink to="/register">Request access</RouterLink>
              </div>

              <v-btn
                type="submit"
                color="primary"
                block
                :loading="isSubmitting"
                :disabled="isSubmitting || !email || !password"
              >
                Sign In
              </v-btn>
            </v-form>

            <v-alert
              v-if="errorMessage"
              type="error"
              class="mt-4"
              border="start"
              density="comfortable"
            >
              {{ errorMessage }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="errorMessage"
      color="error"
      timeout="4000"
      location="bottom right"
    >
      {{ errorMessage }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.fill-height {
  min-height: 100vh;
  background: radial-gradient(circle at top, #1f2937, #0f172a);
}
</style>