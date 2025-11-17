import { computed, ref } from 'vue';
import { fetchUserAPI, getCSRF, loginAPI, logoutAPI } from '@/api/auth';
import { laravel_api as api } from '@/api/client';
import type { User } from '@/utils/types';

const user = ref<User | null>(null);

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

  function setUser(newUser: User) {
    user.value = newUser
  }

  const isAuthenticated = computed(() => !!user.value)

  const isSuperuser = computed(() => user.value?.is_superuser === true)

  const hasRole = (roleName: string) =>
    user.value?.roles?.some((r: any) => r.name === roleName)

  const hasPermission = (permName: string) =>
    user.value?.roles?.flatMap((r: any) => r.permissions).some((p: any) => p.name === permName)

  const isPowerUser = computed(() =>
    hasRole('admin') || hasPermission('assign_permissions') || isSuperuser.value
  )


  return { isAuthenticated, isPowerUser, user, login, logout, fetchUser, setUser }
}
