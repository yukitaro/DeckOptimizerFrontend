<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useAccessControl } from '@/composables/useAccessControl'
import { featureGrants } from '@/config/featureGrants'

const { user, fetchUser } = useAuth()
const { canAccess } = useAccessControl()

onMounted(async () => {
  await fetchUser()
  console.log('User:', user.value)
  for (const key of Object.keys(featureGrants)) {
    console.log(`${key}:`, canAccess(key as keyof typeof featureGrants))
  }  
})
</script>

<template>
  <v-container>
    <h1>Settings</h1>
    <v-list>
      <v-list-item v-if="canAccess('adminConsole')" to="/adminconsole">
        <v-list-item-title>Admin Console</v-list-item-title>
      </v-list-item>

      <v-list-item v-if="canAccess('roleManagement')" to="/adminconsole/roles">
        <v-list-item-title>Admin Roles</v-list-item-title>
      </v-list-item>

      <v-list-item v-if="canAccess('permissionMatrix')" to="/adminconsole/role-permissions">
        <v-list-item-title>Role Permissions</v-list-item-title>
      </v-list-item>

      <v-list-item v-if="canAccess('mtgImport')" to="/importcandidates">
        <v-list-item-title>MTG Set Import</v-list-item-title>
      </v-list-item>

      <v-list-item v-if="canAccess('mtgSetData')" to="/magicsetdata">
        <v-list-item-title>MTG Set Data</v-list-item-title>
      </v-list-item>

      <v-list-item v-if="canAccess('cardMetadata')" to="/cardmetadata">
        <v-list-item-title>Card Metadata</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-container>
</template>