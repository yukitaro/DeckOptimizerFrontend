import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:80'

export const laravel_api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
})
