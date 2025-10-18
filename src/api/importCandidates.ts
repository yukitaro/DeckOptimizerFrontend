import { laravel_api as api } from './client'

export async function fetchImportCandidates() {
  const { data } = await api.get('/api/import-candidates');
  return data;
}

export async function fetchReadyCount() {
  const { data } = await api.get('/api/import-candidates/ready-count');
  return data.ready_count;
}

export async function importCandidate(setCode: string) {
  await api.post(`/api/import-candidates/${setCode}/import`);
}
