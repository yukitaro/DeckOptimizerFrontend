import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useEnumsStore } from '@/stores/enums'
import type { Issue } from '@/utils/types'
import {
  fetchIssues as fetchIssuesAPI,
  createIssue as createIssueAPI,
  updateIssue as updateIssueAPI,
  deleteIssue as deleteIssueAPI,
} from '@/api/issueClient'

export function useIssues() {
  const issues = ref<Issue[]>([])
  const loading = ref(false)
  const error = ref(null)
  const { can } = useAuth()
  const enums = useEnumsStore()

  // ensure enums present before getting issues
  async function ensureIssueEnums() {
    // if already present return quickly
    if (enums.get('issue_types') && enums.get('issue_types').length > 0) return
    await enums.fetchIssueTypes()
  }

  async function fetchIssues() {
    loading.value = true
    try {
      // ensure enum lookup available for label mapping or validation
      await ensureIssueEnums()
      // then fetch issues
      issues.value = await fetchIssuesAPI()
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  async function createIssue(payload: any) {
    if (!can('issues.create')) return Promise.reject(new Error('forbidden'))
    // expect payload.issue_type_id to be set by UI; otherwise convert slug -> id here using enums.get('issue_types')
    return createIssueAPI(payload)
  }

  async function updateIssue(id: number, payload: any) {
    if (!can('issues.update')) return Promise.reject(new Error('forbidden'))
    return updateIssueAPI(id, payload)
  }

  async function deleteIssue(id: number) {
    if (!can('issues.delete')) return Promise.reject(new Error('forbidden'))
    return deleteIssueAPI(id)
  }

  return { issues, loading, error, fetchIssues, createIssue, updateIssue, deleteIssue, ensureIssueEnums }
}