import { laravel_api as api } from './client'
import axios from 'axios';

const localapi = axios.create({
  baseURL: 'http://192.168.4.46',
  withCredentials: true,
})

export async function getCSRF() {
    //axios.get('/sanctum/csrf-cookie');
  return await localapi.get(`/sanctum/csrf-cookie`);
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