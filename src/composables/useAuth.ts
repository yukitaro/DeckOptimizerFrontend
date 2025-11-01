import { ref } from 'vue';
import { fetchUserAPI, getCSRF, loginAPI, logoutAPI,  } from '@/api/auth';
import { laravel_api as api } from '@/api/client';


const user = ref(null)

export function useAuth() {
  async function login(email: string, password: string) {
    await getCSRF()
    const response = await loginAPI(email, password)
    user.value = response.data.user
  }

  async function logout() {
    await logoutAPI()
    delete api.defaults.headers.common.Authorization
    localStorage.removeItem('authToken')
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

  function setUser(newUser) {
    user.value = newUser
  }

  return { user, login, logout, fetchUser, setUser }
}
