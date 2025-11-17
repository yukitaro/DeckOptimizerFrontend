import { useAuth } from '@/composables/useAuth'
import { featureGrants } from '@/config/featureGrants'

export function useAccessControl() {
  const { user } = useAuth()

  const hasPermission = (perm: string) =>
    user.value?.roles?.flatMap(r => r.permissions).some(p => p.name === perm) ||
    user.value?.is_superuser === true

  const canAccess = (feature: keyof typeof featureGrants): boolean => {
    // Explicitly check superuser first
    if (user.value?.is_superuser === true) return true

    const perms = featureGrants[feature]
    if (!perms) {
      console.warn(`Unknown feature: ${feature}`)
      return false
    }

    return perms.some(perm => hasPermission(perm))
  }

  return { canAccess }
}
