import axios from 'axios'

let baseURL = import.meta.env.VITE_API_BASE_URL // default fallback

const origin = window.location.origin

if (origin.includes('192.168.4.161')) {
  baseURL = import.meta.env.VITE_API_BASE_URL
} else if (origin.includes('98.164.213.139')) {
  baseURL = import.meta.env.VITE_API_BASE_URL_WAN
} else {
  baseURL = import.meta.env.VITE_API_BASE_URL_WAN
}

export const laravel_api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
})
