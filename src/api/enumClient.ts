import { laravel_api as api } from './client'

async function fetchGlobalEnums() {
    const response = await api.get('/api/enums');
    return response.data;
}

async function fetchIssueEnums() {
    const response = await api.get('/api/issues/enums');
      console.log('[fetchIssueEnums] raw response:', response)
  console.log('[fetchIssueEnums] response.data:', response.data)
    return response.data;
}

async function createNewEnum(domain: string, payload: { label: string; slug: string; }) {
    const response = await api.post(`/api/admin/enums/${domain}`, payload);
    return response.data;
}

export { createNewEnum, fetchGlobalEnums, fetchIssueEnums };