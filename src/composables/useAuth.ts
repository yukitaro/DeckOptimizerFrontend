import { ref } from 'vue';
import { fetchUserAPI, getCSRF, loginAPI, logoutAPI,  } from '@/api/auth';


const user = ref(null)

export function useAuth() {
  async function login(email: string, password: string) {
    await getCSRF()
    const response = await loginAPI(email, password)
    user.value = response.data.user
  }

  async function logout() {
    await logoutAPI()
    user.value = null
  }

  async function fetchUser() {
    try {
      const response = await fetchUserAPI()
      user.value = response.data
    } catch {
      user.value = null
    }
  }

  return { user, login, logout, fetchUser }
}
