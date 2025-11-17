import { computed, ref } from 'vue'
import { fetchUsers,
         fetchPermissions as fetchPermissionsAPI,
         fetchRoles as fetchRolesAPI,
         assignRoles as assignRolesAPI,
         assignPermissions as assignPermissionsAPI } from '@/api/roleClient'
import type { Permission, Role, User } from '@/utils/types'

export const useAdminRoles = () => {
  const users = ref<User[]>([])
  const roles = ref<Role[]>([])
  const permissions = ref<Permission[]>([])

  const loadUsers = async () => {
    users.value = await fetchUsers()
  }

  const fetchRoles = async () => {
    roles.value = await fetchRolesAPI()
  }

  const fetchPermissions = async () => {
    permissions.value = await fetchPermissionsAPI()
  }

    const permissionGroups = computed(() => {
    const groups: Record<string, { label: string, permissions: Permission[] }> = {
        issues: { label: 'Issues', permissions: [] },
        users: { label: 'Users', permissions: [] },
        decks: { label: 'Decks', permissions: [] },
        collections: { label: 'Collections', permissions: [] },
    }

    for (const perm of permissions.value) {
        if (perm.name.includes('issue')) groups.issues.permissions.push(perm)
        else if (perm.name.includes('user')) groups.users.permissions.push(perm)
        else if (perm.name.includes('deck')) groups.decks.permissions.push(perm)
        else if (perm.name.includes('collection')) groups.collections.permissions.push(perm)
    }

    return Object.values(groups)
    })


  const assignRoles = async (userId: number, roleIds: number[]) => {
    await assignRolesAPI(userId, roleIds)
  }
  const assignPermissions = async (roleId: number, permissionIds: number[]) => {
    await assignPermissionsAPI(roleId, permissionIds)
  }

  return { users, roles, permissions, permissionGroups, fetchPermissions, fetchRoles, loadUsers, assignRoles, assignPermissions }
}