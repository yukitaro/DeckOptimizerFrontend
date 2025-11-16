import { ref } from 'vue'
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

  const assignRoles = async (userId: number, roleIds: number[]) => {
    await assignRolesAPI(userId, roleIds)
  }
  const assignPermissions = async (roleId: number, permissionIds: number[]) => {
    await assignPermissionsAPI(roleId, permissionIds)
  }

  return { users, roles, permissions, fetchPermissions, fetchRoles, loadUsers, assignRoles, assignPermissions }
}