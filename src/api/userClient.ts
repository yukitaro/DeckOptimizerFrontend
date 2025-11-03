import { laravel_api as api } from './client'
import { getCSRF, loginAPI } from '@/api/auth';

export async function registerNewUser(payload: { name: string; email: string; password: string; password_confirmation: string; }) {
    await getCSRF()
    const response = await api.post('/api/register', payload)
    return response
}

export async function loginUser(payload: { email: string; password: string; remember: boolean; }) {
    await getCSRF()
    const response = await api.post('/api/login', payload)
    return response
}

export async function forgotPasswordSendEmail(email: string) {
    await getCSRF()
    const response = await api.post('/api/forgot-password', { email })
    return response
}

export async function resetUserPassword(payload: { token: string; email: string; password: string; password_confirmation: string; }) {
    await getCSRF()
    const response = await api.post('/api/reset-password', payload)
    return response
}