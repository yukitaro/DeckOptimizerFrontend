<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { forgotPasswordSendEmail } from '@/api/userClient'

const emailForAccountRecovery = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref<'success' | 'error'>('success')

let toastTimer: ReturnType<typeof setTimeout> | null = null

const isEmailValid = computed(() =>
  /\S+@\S+\.\S+/.test(emailForAccountRecovery.value.trim())
)

const canSubmit = computed(
  () => isEmailValid.value && !isSubmitting.value && emailForAccountRecovery.value.trim() !== ''
)

const errorMessages = computed(() =>
  errorMessage.value ? [errorMessage.value] : []
)

const clearToastTimer = () => {
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
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

const onEmailInput = () => {
  if (errorMessage.value) {
    errorMessage.value = ''
  }
}

const submitRecoveryRequest = async () => {
  if (!isEmailValid.value) {
    errorMessage.value = 'Please enter a valid email address.'
    return
  }

  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    forgotPasswordSendEmail(emailForAccountRecovery.value.trim())
    openToast('If that email exists, check your inbox for reset instructions.')
    emailForAccountRecovery.value = ''
  } finally {
    isSubmitting.value = false
  }
}

onUnmounted(() => {
  clearToastTimer()
})
</script>

<template>
  <v-container class="forgot-background" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card elevation="10" class="pa-4">
          <v-card-title class="text-h5 font-weight-bold">
            Forgot your account?
          </v-card-title>
          <v-card-subtitle class="mb-4">
            Enter the email tied to your account and we’ll send recovery instructions.
          </v-card-subtitle>

          <v-card-text>
            <v-form @submit.prevent="submitRecoveryRequest">
              <v-text-field
                v-model="emailForAccountRecovery"
                label="Email address"
                name="email"
                autocomplete="email"
                type="email"
                prepend-inner-icon="mdi-email-outline"
                :disabled="isSubmitting"
                :error="Boolean(errorMessages.length)"
                :error-messages="errorMessages"
                clearable
                required
                @input="onEmailInput"
              />

              <div class="text-caption mb-4">
                If we find a matching account we’ll email you a reset link right away.
              </div>

              <v-btn
                type="submit"
                color="primary"
                block
                :loading="isSubmitting"
                :disabled="!canSubmit"
              >
                Email me recovery instructions
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
.forgot-background {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: radial-gradient(circle at top, #1f2937, #0f172a);
  padding: 20px;
}

.v-card-subtitle {
  color: rgba(30, 41, 59, 0.7);
}
</style>