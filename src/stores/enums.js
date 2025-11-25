// src/stores/enums.js
import { defineStore } from 'pinia'
import { fetchGlobalEnums, fetchIssueEnums } from '@/api/enumClient'
import { ref } from 'vue'

export const useEnumsStore = defineStore('enums', () => {
  const data = ref({})
  const versions = ref({})
  const loading = ref({}) // domain -> boolean

  // generic domain loader helper
  async function fetchDomain(domain, loader) {
    if (loading.value[domain]) return
    loading.value[domain] = true
    try {
        const resp = await loader()
        // unwrap if the domain is nested under resp.data
        if (resp.data && resp.data[domain]) {
        data.value[domain] = resp.data[domain]
        versions.value[domain] = resp.version ?? versions.value[domain] ?? 0
        } else {
        data.value[domain] = resp.data ?? []
        versions.value[domain] = resp.version ?? versions.value[domain] ?? 0
        }
        return data.value[domain]
    } finally {
        loading.value[domain] = false
    }
  }

  // bootstrap global enums (roles, permissions, small domain sets)
  async function fetchAll() {
    const resp = await fetchGlobalEnums()
    // expected shape: { data: { ... }, versions: { ... } } or { data, version }
    if (resp.data && resp.versions) {
      data.value = resp.data
      versions.value = resp.versions
    } else {
      // fallback for older shape
      data.value = resp.data ?? resp
      versions.value = resp.version ? { global: resp.version } : versions.value
    }
    return data.value
  }

  // domain-specific convenience
  async function fetchIssueTypes() {
    return fetchDomain('issue_types', fetchIssueEnums)
  }

  function get(domain) { return data.value[domain] ?? [] }
  function getVersion(domain) { return versions.value[domain] ?? 0 }
  function isLoading(domain) { return !!loading.value[domain] }

  return { data, versions, loading, fetchAll, fetchDomain, fetchIssueTypes, get, getVersion, isLoading }
})
