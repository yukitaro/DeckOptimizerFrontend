<script setup lang="ts">
import { reactive, ref, onMounted, watch } from 'vue'
import { useIssues } from '@/composables/useIssues'
import { useAuth } from '@/composables/useAuth'
import { useEnumsStore } from '@/stores/enums'
import type { IssueForm } from '@/utils/types'
import { useSiteFeaturesStore } from '@/stores/siteFeatures'

const { issues, fetchIssues, createIssue, updateIssue, deleteIssue } = useIssues()
const { can } = useAuth()
const enums = useEnumsStore()
const siteFeatures = useSiteFeaturesStore()

// UI state
const tab = ref('Issue Management')
const tabLabels = [
  'Issue Management',
  'Issue Import',
  'Issue Display',
  'Issue Comparison'
]

// typed reactive form
const defaultForm = (): IssueForm => ({
  title: '',
  description: '',
  type: null,
  priority: '',
  site_mode: null,
  feature_slug: null,
})

const form = reactive<IssueForm>(defaultForm())

// available features for the selected mode
const availableFeatures = ref<{ slug: string; feature_name: string }[]>([])

// load enums, issues and site features on mount
onMounted(async () => {
  await enums.fetchIssueTypes()
  await fetchIssues()

  if (!siteFeatures.isLoaded) {
    await siteFeatures.fetchAll()
  }
})

// populate availableFeatures when site_mode changes
watch(() => form.site_mode, (mode) => {
  if (!mode) {
    availableFeatures.value = []
    form.feature_slug = null
    return
  }

  const list = siteFeatures.getFeaturesForMode(mode)
  availableFeatures.value = list.map(f => ({ slug: f.slug, feature_name: f.feature_name }))

  // optional: auto-select first enabled feature if none selected
  if (availableFeatures.value.length && !form.feature_slug) {
    form.feature_slug = availableFeatures.value[0].slug
  }
})

// submit handler using the composable
const submitNewIssue = async () => {
  if (!form.title || !form.description) return

  const payload: Partial<IssueForm> = {
    title: form.title,
    description: form.description,
    type: form.type ?? undefined,
    priority: form.priority ?? undefined,
    site_mode: form.site_mode ?? undefined,
    feature_slug: form.feature_slug ?? undefined,
  }

  try {
    await createIssue(payload)
    // refresh list
    await fetchIssues()
    // reset form
    Object.assign(form, defaultForm())
  } catch (err) {
    // handle errors as needed (validation, toast, etc.)
    console.error('Failed to create issue', err)
  }
}

// quick helpers for inline actions
const handleUpdate = async (issue: any) => {
  try {
    await updateIssue(issue.id, { title: issue.title })
    await fetchIssues()
  } catch (err) {
    console.error('Failed to update issue', err)
  }
}

const handleDelete = async (issueId: number) => {
  try {
    await deleteIssue(issueId)
    await fetchIssues()
  } catch (err) {
    console.error('Failed to delete issue', err)
  }
}
</script>

<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Issues Dashboard</v-toolbar-title>
      <template #extension>
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
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.title" label="Issue Title" required />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="form.type"
                :items="enums.get('issue_types')"
                item-title="label"
                item-value="slug"
                label="Issue Type"
                required
              />
            </v-col>

            <v-col cols="12">
              <v-textarea v-model="form.description" label="Issue Description" required />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.priority"
                :items="['Low','Medium','High','Critical']"
                label="Priority"
                required
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.site_mode"
                :items="siteFeatures.siteModes"
                label="Site Mode"
                clearable
                hint="Select the site mode this issue applies to"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.feature_slug"
                :items="availableFeatures"
                item-title="feature_name"
                item-value="slug"
                label="Feature"
                :disabled="!form.site_mode || !availableFeatures.length"
                clearable
                hint="Select the specific feature (optional)"
              />
            </v-col>
          </v-row>

          <v-btn v-if="can('issues.create')" type="submit" color="primary" class="mt-4">
            Create Issue
          </v-btn>
        </v-form>

        <v-divider class="my-6" />

        <h3 class="text-h6 mb-3">Existing Issues</h3>
        <v-list two-line>
          <v-list-item v-for="issue in issues" :key="issue.id">
            <v-list-item-content>
              <v-list-item-title>{{ issue.title }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ issue.description }}
                <template v-if="issue.site_feature">
                  — <strong>{{ issue.site_feature.feature_name }}</strong>
                </template>
              </v-list-item-subtitle>
            </v-list-item-content>

            <v-list-item-action>
              <v-btn
                v-if="can('issues.update', issue)"
                icon="mdi-pencil"
                @click="handleUpdate(issue)"
              />
              <v-btn
                v-if="can('issues.delete', issue)"
                icon="mdi-delete"
                @click="handleDelete(issue.id)"
              />
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-card>

      <!-- 📥 Issue Import -->
      <v-card v-if="tab === 'Issue Import'" class="pa-4">
        <h2 class="text-h5 mb-4">Import Issues</h2>
        <!-- File upload / bulk import UI placeholder -->
        <p class="text-body-2">Upload CSV/JSON to bulk-create issues (coming soon).</p>
      </v-card>

      <!-- 👁️ Issue Display -->
      <v-card v-if="tab === 'Issue Display'" class="pa-4">
        <h2 class="text-h5 mb-4">Issue Display</h2>
        <!-- Single issue detail view placeholder -->
        <p class="text-body-2">Select an issue to view details (coming soon).</p>
      </v-card>

      <!-- 🔍 Issue Comparison -->
      <v-card v-if="tab === 'Issue Comparison'" class="pa-4">
        <h2 class="text-h5 mb-4">Compare Issues</h2>
        <!-- Comparison UI placeholder -->
        <p class="text-body-2">Compare two or more issues side-by-side (coming soon).</p>
      </v-card>
    </v-window>
  </v-card>
</template>
