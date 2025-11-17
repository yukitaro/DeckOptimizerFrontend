<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useAdminRoles } from '@/composables/useAdminRoles'
import type { Role, Permission } from '@/utils/types'

const {
  roles,
  permissions,
  permissionGroups,
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
                v-for="group in permissionGroups"
                :key="group.label"
                class="text-center"
            >
                <v-tooltip bottom>
                <template #activator="{ props }">
                    <span v-bind="props">{{ group.label }}</span>
                </template>
                <span>{{ group.permissions.map(p => p.name).join(', ') }}</span>
                </v-tooltip>
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
                v-for="group in permissionGroups"
                :key="group.label"
                class="text-center"
            >
                <v-menu>
                <template #activator="{ props }">
                    <v-btn
                    v-bind="props"
                    variant="text"
                    size="small"
                    >
                    {{
                        group.permissions.filter(p =>
                        selectedPermissions[role.id]?.has(p.id)
                        ).length
                    }}/{{ group.permissions.length }}
                    </v-btn>
                </template>

                <v-list>
                    <v-list-item
                    v-for="perm in group.permissions"
                    :key="perm.id"
                    >
                    <v-checkbox
                        :label="perm.name"
                        :model-value="selectedPermissions[role.id]?.has(perm.id) ?? false"
                        @update:model-value="togglePermission(role.id, perm.id)"
                    />
                    </v-list-item>
                </v-list>
                </v-menu>
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
