import { laravel_api as api } from './client'

export async function getCSRF() {
    //axios.get('/sanctum/csrf-cookie');
  return await api.get(`/sanctum/csrf-cookie`);
}

export async function loginAPI(email: string, password: string) {
    return await api.post('/api/login', { email, password });
}

export async function logoutAPI() {
    return await api.post('/logout');
}

export async function fetchUserAPI() {
    return await api.get('/api/user');
}