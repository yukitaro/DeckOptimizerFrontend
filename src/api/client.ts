import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_LARAVEL_API_BASE_URL ?? ''

export const laravel_api = axios.create({
  baseURL,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
})
