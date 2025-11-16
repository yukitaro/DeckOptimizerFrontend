<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useAdminRoles } from '@/composables/useAdminRoles'
import type { User } from '@/utils/types'

const {
  users,
  roles,
  loadUsers,
  assignRoles,
} = useAdminRoles()

const selectedRoles = reactive<Record<number, number[]>>({})

const headers = [
  { title: 'User', key: 'email' },
  { title: 'Roles', key: 'roles' },
  { title: 'Assign Roles', key: 'assign' },
]

const saveRoles = async (userId: number) => {
  const roleIds = selectedRoles[userId] || []
  await assignRoles(userId, roleIds)
  await loadUsers()
}

onMounted(async () => {
  await loadUsers()
  // roles.value = await fetchRoles() once wired
})
</script>
<template>
  <v-container class="py-6">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h5 font-weight-bold">Admin: Role & Permission Management</h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-data-table
          :items="users"
          :headers="headers"
          item-value="id"
          class="elevation-1"
        >
          <template #item.roles="{ item }">
            <v-chip-group column>
              <v-chip
                v-for="role in item.roles"
                :key="role.id"
                color="primary"
                variant="outlined"
                size="small"
              >
                {{ role.name }}
              </v-chip>
            </v-chip-group>
          </template>

          <template #item.assign="{ item }">
            <v-select
              v-model="selectedRoles[item.id]"
              :items="roles"
              item-title="name"
              item-value="id"
              multiple
              chips
              density="compact"
              class="mt-1"
              label="Assign Roles"
            />
            <v-btn
              class="mt-2"
              color="success"
              size="small"
              @click="saveRoles(item.id)"
            >
              Save
            </v-btn>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>
