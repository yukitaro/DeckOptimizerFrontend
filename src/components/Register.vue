<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { registerNewUser } from '@/api/userClient'
import { useRoute } from 'vue-router'

const route = useRoute()

const accountname = ref('')
const displayName = ref('')
const email = ref('')
const password = ref('')
const password_confirmation = ref('')
const invitationToken = ref(
  typeof route.query.token === 'string' ? route.query.token : ''
)

const confirmTouched = ref(false)
const isSubmitting = ref(false)
const registerError = ref('')

const showToast = ref(false)
const toastMessage = ref('')
let toastTimer = null

const passwordsMatch = computed(
  () =>
    password.value !== '' &&
    password_confirmation.value !== '' &&
    password.value === password_confirmation.value
)
const showPasswordError = computed(
  () => confirmTouched.value && password_confirmation.value !== '' && !passwordsMatch.value
)
const showPasswordSuccess = computed(
  () => confirmTouched.value && passwordsMatch.value
)
const canSubmit = computed(() =>
  Boolean(
    accountname.value.trim() &&
      email.value.trim() &&
      password.value &&
      password_confirmation.value &&
      passwordsMatch.value &&
      !isSubmitting.value
  )
)

const handlePasswordInput = () => {
  if (confirmTouched.value && password_confirmation.value === '') {
    confirmTouched.value = false
  }
}

const handleConfirmInput = () => {
  confirmTouched.value = true
}

const showToastMessage = (message) => {
  toastMessage.value = message
  showToast.value = true

  if (toastTimer) {
    clearTimeout(toastTimer)
  }

  toastTimer = setTimeout(() => {
    showToast.value = false
    toastTimer = null
  }, 4000)
}

const resetForm = () => {
  accountname.value = ''
  email.value = ''
  password.value = ''
  password_confirmation.value = ''
  confirmTouched.value = false
}

const registerUser = async () => {
  registerError.value = ''
  confirmTouched.value = true

  if (!passwordsMatch.value) {
    return
  }

  invitationToken.value =
    typeof route.query.token === 'string'
      ? route.query.token
      : invitationToken.value

  try {
    isSubmitting.value = true

    
    const response = await registerNewUser({
      name: accountname.value,
      alias: displayName.value || undefined,
      email: email.value,
      password: password.value,
      password_confirmation: password_confirmation.value,
      invitation_token: invitationToken.value || undefined
    })

    if (response?.status >= 200 && response?.status < 300) {
      showToastMessage('Account created! You can now sign in.')
      resetForm()
    }
  } catch (error) {
    registerError.value =
      error?.response?.data?.message ||
      'Registration failed. Please check your details and try again.'
  } finally {
    isSubmitting.value = false
  }
}

onUnmounted(() => {
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
})
</script>

<template>
  <div class="register-page">
    <transition name="toast-fade">
      <div
        v-if="showToast"
        class="toast success-toast"
        role="status"
        aria-live="polite"
      >
        {{ toastMessage }}
      </div>
    </transition>

    <div class="register-container">
      <h2>Create your account</h2>
      <p class="subtitle">
        Join the DeckOptimizer community with your invitation link.
      </p>

      <div v-if="registerError" class="error-banner" role="alert">
        {{ registerError }}
      </div>

      <form @submit.prevent="registerUser" novalidate>
        <div class="form-group">
          <label for="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            v-model.trim="accountname"
            required
            autocomplete="name"
          />
        </div>
        <div class="form-group">
          <label for="displayName">Display Name (Alias)</label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            v-model.trim="displayName"
            autocomplete="nickname"
          />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            v-model.trim="email"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            v-model="password"
            required
            autocomplete="new-password"
            @input="handlePasswordInput"
          />
        </div>

        <div class="form-group">
          <label for="password_confirmation">Confirm password</label>
          <div
            class="input-wrapper"
            :class="{
              'has-error': showPasswordError,
              'has-success': showPasswordSuccess
            }"
          >
            <input
              type="password"
              id="password_confirmation"
              v-model="password_confirmation"
              required
              autocomplete="new-password"
              @input="handleConfirmInput"
              :class="{ 'input-error': showPasswordError }"
            />
            <span
              v-if="showPasswordSuccess"
              class="status-dot success"
              aria-hidden="true"
            >
              ✓
            </span>
            <span
              v-else-if="showPasswordError"
              class="status-dot error"
              aria-hidden="true"
            >
              !
            </span>
          </div>
          <p v-if="showPasswordError" class="helper error">
            Passwords must match.
          </p>
          <p v-else-if="showPasswordSuccess" class="helper success">
            Looks good!
          </p>
        </div>

        <button type="submit" :disabled="!canSubmit">
          <span v-if="isSubmitting">Registering…</span>
          <span v-else>Create account</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #eef2ff, #f8fafc);
  padding: 24px;
}

.register-container {
  width: min(520px, 100%);
  background: linear-gradient(155deg, #ffffff, #f5f7ff);
  border-radius: 18px;
  padding: 36px 34px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.16);
}

h2 {
  margin: 0;
  font-size: 1.85rem;
  font-weight: 700;
  color: #0f172a;
}

.subtitle {
  margin-top: 8px;
  margin-bottom: 28px;
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.5;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1.4rem;
}

label {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
}

input {
  width: 100%;
  font-size: 1rem;
  padding: 0.75rem 0.95rem;
  border-radius: 12px;
  border: 1px solid #d1d5db;
  background: #f8fafc;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
  background: #fff;
}

.input-wrapper {
  position: relative;
}

.input-wrapper.has-success input {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
  background: #ffffff;
}

.input-wrapper.has-error input,
.input-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18);
  background: #fff;
}

.status-dot {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  font-size: 0.85rem;
  font-weight: 600;
}

.status-dot.success {
  color: #10b981;
}

.status-dot.error {
  color: #ef4444;
}

.helper {
  margin: 0;
  font-size: 0.83rem;
}

.helper.error {
  color: #dc2626;
}

.helper.success {
  color: #059669;
}

button {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  box-shadow: 0 15px 30px rgba(99, 102, 241, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.35);
}

button:disabled {
  background: linear-gradient(135deg, #cbd5f5, #d8bff9);
  cursor: not-allowed;
  box-shadow: none;
  color: #e2e8f0;
}

.error-banner {
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 1.5rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #b91c1c;
  font-weight: 500;
}

.toast {
  position: fixed;
  top: 32px;
  right: 32px;
  padding: 14px 20px;
  border-radius: 14px;
  font-weight: 600;
  box-shadow: 0 16px 35px rgba(15, 23, 42, 0.24);
  z-index: 1200;
}

.toast.success-toast {
  background: linear-gradient(135deg, #10b981, #22c55e);
  color: #f0fdf4;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

@media (max-width: 480px) {
  .register-page {
    padding: 16px;
  }

  .register-container {
    padding: 28px 24px;
  }

  .toast {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }
}
</style>