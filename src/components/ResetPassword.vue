<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetUserPassword } from '@/api/userClient'

const route = useRoute()
const router = useRouter()

const token = typeof route.query.token === 'string' ? route.query.token : ''
const email = typeof route.query.email === 'string' ? route.query.email : ''

const password = ref('')
const passwordConfirmation = ref('')
const confirmTouched = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref<'success' | 'error'>('success')

let toastTimer: ReturnType<typeof setTimeout> | null = null
let redirectTimer: ReturnType<typeof setTimeout> | null = null

const minLengthMet = computed(() => password.value.length >= 8)
const passwordsMatch = computed(
  () =>
    password.value !== '' &&
    passwordConfirmation.value !== '' &&
    password.value === passwordConfirmation.value
)
const showPasswordError = computed(
  () =>
    confirmTouched.value &&
    passwordConfirmation.value !== '' &&
    !passwordsMatch.value
)
const showPasswordSuccess = computed(
  () => confirmTouched.value && passwordsMatch.value
)
const linkInvalid = computed(() => !token || !email)
const canSubmit = computed(
  () => minLengthMet.value && passwordsMatch.value && !isSubmitting.value && !linkInvalid.value
)

const clearToastTimer = () => {
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
}

const clearRedirectTimer = () => {
  if (redirectTimer) {
    clearTimeout(redirectTimer)
    redirectTimer = null
  }
}

const openToast = (message: string, color: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastColor.value = color
  showToast.value = true
  clearToastTimer()

  toastTimer = setTimeout(() => {
    showToast.value = false
    toastTimer = null
  }, 4000)
}

const handlePasswordInput = () => {
  if (confirmTouched.value && passwordConfirmation.value === '') {
    confirmTouched.value = false
  }
}

const handleConfirmInput = () => {
  confirmTouched.value = true
}

const submitPasswordReset = async () => {
  confirmTouched.value = true
  errorMessage.value = ''

  if (linkInvalid.value) {
    const message = 'This reset link is invalid or has expired.'
    errorMessage.value = message
    openToast(message, 'error')
    return
  }

  if (!passwordsMatch.value) {
    errorMessage.value = 'Passwords must match.'
    return
  }

  if (!minLengthMet.value) {
    errorMessage.value = 'Password must be at least 8 characters.'
    return
  }

  try {
    isSubmitting.value = true

    await resetUserPassword({
      token,
      email,
      password: password.value,
      password_confirmation: passwordConfirmation.value
    })

    openToast('Password updated! Redirecting to sign in…')
    clearRedirectTimer()
    redirectTimer = setTimeout(() => {
      router.push({ path: '/login' })
    }, 1200)
  } catch (error: any) {
    const message =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      'We couldn’t reset your password. Please try again.'
    errorMessage.value = message
    openToast(message, 'error')
  } finally {
    isSubmitting.value = false
  }
}

onUnmounted(() => {
  clearToastTimer()
  clearRedirectTimer()
})
</script>

<template>
  <v-container class="reset-background" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card elevation="10" class="pa-4">
          <v-card-title class="text-h5 font-weight-bold">
            Reset your password
          </v-card-title>
          <v-card-subtitle class="mb-4">
            Choose a fresh password for your DeckOptimizer account.
          </v-card-subtitle>

          <v-card-text>
            <v-alert
              v-if="linkInvalid"
              type="error"
              variant="tonal"
              border="start"
              class="mb-4"
            >
              This reset link is missing required information. Please request a new email.
            </v-alert>

            <v-form @submit.prevent="submitPasswordReset">
              <v-text-field
                v-if="email"
                :model-value="email"
                label="Email address"
                name="email"
                autocomplete="email"
                prepend-inner-icon="mdi-email-outline"
                readonly
                variant="outlined"
                class="mb-3"
              />

              <v-text-field
                v-model="password"
                label="New password"
                type="password"
                autocomplete="new-password"
                prepend-inner-icon="mdi-lock-reset"
                :disabled="isSubmitting"
                :error="Boolean(errorMessage) && !passwordsMatch"
                :hint="'Minimum 8 characters'"
                persistent-hint
                required
                @input="handlePasswordInput"
              />

              <v-text-field
                v-model="passwordConfirmation"
                label="Confirm new password"
                type="password"
                autocomplete="new-password"
                prepend-inner-icon="mdi-lock-check-outline"
                :disabled="isSubmitting"
                :error="showPasswordError"
                :success="showPasswordSuccess"
                :success-messages="showPasswordSuccess ? ['Looks good!'] : []"
                :error-messages="showPasswordError ? ['Passwords must match.'] : []"
                required
                @input="handleConfirmInput"
              />

              <v-alert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                border="start"
                class="mt-4"
              >
                {{ errorMessage }}
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                block
                class="mt-6"
                :loading="isSubmitting"
                :disabled="!canSubmit"
              >
                Reset password
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="showToast"
      :timeout="4000"
      :color="toastColor"
      location="bottom right"
      variant="flat"
    >
      {{ toastMessage }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.reset-background {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: radial-gradient(circle at top, #111827, #0f172a);
  padding: 24px;
}

.v-card-subtitle {
  color: rgba(30, 41, 59, 0.72);
}
</style>