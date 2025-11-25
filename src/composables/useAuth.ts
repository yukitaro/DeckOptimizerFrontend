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

  // TODO: I don't really know if "assign_permissions" is the right way to determine a poweruser..
  const isPowerUser = computed(() =>
    hasRole('admin') || hasPermission('assign_permissions') || isSuperuser.value
  )

  /**
   * Unified permission check
   * @param action string like 'issues.create' or 'collections.update'
   * @param resource optional resource object for delegated checks
   */
  function can(action: string, resource?: any): boolean {
    if (isSuperuser.value) return true

    // Global role/permission check
    if (hasPermission(action)) return true

    // Delegated resource-level check
    if (resource && resource.permissions) {
      return resource.permissions.some((p: any) => p.name === action && p.user_id === user.value?.id)
    }

    return false
  }

  return { isAuthenticated, isPowerUser, user, login, logout, fetchUser, setUser, can }
}
