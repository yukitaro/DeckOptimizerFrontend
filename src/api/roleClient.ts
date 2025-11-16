import { laravel_api as api } from './client'
import type { Permission, Role, User } from '@/utils/types'

async function fetchUsers() : Promise<User[]> {
    const response = await api.get('/api/admin/users');
    return response.data;
}

async function fetchRoles() : Promise<Role[]> {
    const response = await api.get('/api/admin/roles');
    return response.data;
}

async function fetchPermissions() : Promise<Permission[]> {
    const response = await api.get('/api/admin/permissions');
    return response.data;
}

async function assignRoles(userId: number, role_ids: number[]) : Promise<any> {
    const response = await api.post(`/api/admin/users/${userId}/roles`, { role_ids });
    return response.data;
}

async function assignPermissions(roleId: number, permissionIds: number[]) : Promise<any> {
    const response = await api.post(`/api/admin/roles/${roleId}/permissions`, { permission_ids: permissionIds });
    return response.data;
}

export { fetchPermissions, fetchRoles, fetchUsers, assignRoles, assignPermissions };