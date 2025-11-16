<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useAdminRoles } from '@/composables/useAdminRoles'
import type { Role, Permission } from '@/utils/types'

const {
  roles,
  permissions,
  assignPermissions,
  fetchRoles,
  fetchPermissions,
} = useAdminRoles()

const selectedPermissions = reactive<Record<number, Set<number>>>({})

const togglePermission = (roleId: number, permissionId: number) => {
  const set = selectedPermissions[roleId] ?? new Set()
  if (set.has(permissionId)) {
    set.delete(permissionId)
  } else {
    set.add(permissionId)
  }
  selectedPermissions[roleId] = set
}

const savePermissions = async (roleId: number) => {
  const permissionIds = Array.from(selectedPermissions[roleId] ?? [])
  await assignPermissions(roleId, permissionIds)
}

onMounted(async () => {
  await fetchRoles()
  await fetchPermissions()

  // Initialize selectedPermissions from fetched roles
  for (const role of roles.value) {
    selectedPermissions[role.id] = new Set(role.permissions.map(p => p.id))
  }
})
</script>


<template>
  <v-container class="py-6">
    <h2 class="text-h5 font-weight-bold mb-4">Role-Permission Matrix</h2>

    <v-table>
      <thead>
        <tr>
          <th>Role</th>
          <th
            v-for="permission in permissions"
            :key="permission.id"
            class="text-center"
          >
            {{ permission.name }}
          </th>
          <th class="text-center">Actions</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="role in roles"
          :key="role.id"
        >
          <td>{{ role.name }}</td>

          <td
            v-for="permission in permissions"
            :key="permission.id"
            class="text-center"
          >
            <v-checkbox
              :model-value="selectedPermissions[role.id]?.has(permission.id) ?? false"
              @update:model-value="togglePermission(role.id, permission.id)"
              hide-details
              density="compact"
            />
          </td>

          <td class="text-center">
            <v-btn
              color="primary"
              size="small"
              @click="savePermissions(role.id)"
            >
              Save
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>
