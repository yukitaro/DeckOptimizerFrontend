<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useIssues } from '@/composables/useIssues'
import { useAuth } from '@/composables/useAuth'
import { useEnumsStore } from '@/stores/enums'

const { issues, fetchIssues, createIssue, updateIssue, deleteIssue } = useIssues()
const { can } = useAuth()
const enums = useEnumsStore()

const tab = ref('Issue Management')
const tabLabels = [
  'Issue Management',
  'Issue Import',
  'Issue Display',
  'Issue Comparison'
]

// Example state for forms
const newIssueTitle = ref('')
const newIssueDescription = ref('')
const newIssueType = ref('')
const newIssuePriority = ref('')

const submitNewIssue = async () => {
  if (!newIssueTitle.value || !newIssueDescription.value) return
  await createIssue({
    title: newIssueTitle.value,
    description: newIssueDescription.value,
    type: newIssueType.value,
    priority: newIssuePriority.value,
  })
  // reset form
  newIssueTitle.value = ''
  newIssueDescription.value = ''
  newIssueType.value = ''
  newIssuePriority.value = ''
}

onMounted (async () => {
  await enums.fetchIssueTypes()
  await fetchIssues()
})
</script>

<template>
  <v-card>
    <v-toolbar color="primary">
      <v-toolbar-title>Issues Dashboard</v-toolbar-title>
      <template v-slot:extension>
        <v-tabs v-model="tab" align-tabs="center">
          <v-tab v-for="label in tabLabels" :key="label" :value="label">
            {{ label }}
          </v-tab>
        </v-tabs>
      </template>
    </v-toolbar>

    <v-window v-model="tab" transition="false">
      <!-- 📝 Issue Management -->
      <v-card v-if="tab === 'Issue Management'" class="pa-4">
        <h2 class="text-h5 mb-4">Manage Issues</h2>

        <v-form @submit.prevent="submitNewIssue">
          <v-text-field
            v-model="newIssueTitle"
            label="Issue Title"
            required
          />
          <v-textarea
            v-model="newIssueDescription"
            label="Issue Description"
            required
          />
          <v-select 
            v-model="newIssueType"
            :items="enums.get('issue_types')"
            item-title="label"
            item-value="slug"
            label="Issue Type"
            required
          />
          <v-select
            v-model="newIssuePriority"
            :items="['Low','Medium','High','Critical']"
            label="Priority"
            required
          />

          <v-btn
            v-if="can('issues.create')"
            type="submit"
            color="primary"
            class="mt-4"
          >
            Create Issue
          </v-btn>
        </v-form>

        <v-divider class="my-6" />

        <v-list>
          <v-list-item
            v-for="issue in issues"
            :key="issue.id"
          >
            <v-list-item-title>{{ issue.title }}</v-list-item-title>
            <v-list-item-subtitle>{{ issue.description }}</v-list-item-subtitle>
            <template #append>
              <v-btn
                v-if="can('issues.update', issue)"
                icon="mdi-pencil"
                @click="updateIssue(issue.id, { title: issue.title })"
              />
              <v-btn
                v-if="can('issues.delete', issue)"
                icon="mdi-delete"
                @click="deleteIssue(issue.id)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card>

      <!-- 📥 Issue Import -->
      <v-card v-if="tab === 'Issue Import'" class="pa-4">
        <h2 class="text-h5 mb-4">Import Issues</h2>
        <!-- Form or file upload for bulk import -->
      </v-card>

      <!-- 👁️ Issue Display -->
      <v-card v-if="tab === 'Issue Display'" class="pa-4">
        <h2 class="text-h5 mb-4">Issue Display</h2>
        <!-- Single issue detail view -->
      </v-card>

      <!-- 🔍 Issue Comparison -->
      <v-card v-if="tab === 'Issue Comparison'" class="pa-4">
        <h2 class="text-h5 mb-4">Compare Issues</h2>
        <!-- Comparison UI -->
      </v-card>
    </v-window>
  </v-card>
</template>
