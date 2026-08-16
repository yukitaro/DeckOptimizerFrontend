import { laravel_api as api } from './client'
import type { Issue, IssueForm } from '@/utils/types'

async function fetchIssues() : Promise<IssueForm[]> {
    const response = await api.get('/api/issues');
    return response.data;
}

async function createIssue(payload: Partial<IssueForm>) : Promise<Issue> {
    const response = await api.post('/api/issues', payload);
    return response.data;
}

async function updateIssue(id: number, payload: {
                                                    title: string;
                                                    description: string;
                                                    priority: string;
                                                    type: string;
                                                    assignee_id: number | null;
                                                    status: string;
                                     }) : Promise<Issue> {
    const response = await api.put(`/api/issues/${id}`, payload);
    return response.data;
}

async function deleteIssue(id: number) : Promise<void> {
    await api.delete(`/api/issues/${id}`);
}



export { createIssue, deleteIssue, fetchIssues, updateIssue };