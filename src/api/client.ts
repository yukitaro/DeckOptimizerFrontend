import axios from 'axios'

let baseURL = import.meta.env.VITE_API_BASE_URL // default fallback

const host = typeof window !== "undefined" ? window.location.hostname : "";

if (host.includes('192.168.4.161')) {
  baseURL = import.meta.env.VITE_API_BASE_URL
} else if (host.includes('98.164.213.139')) {
  baseURL = import.meta.env.VITE_API_BASE_URL_WAN
} else if (host === "deck.thekiharas.com" || host.endsWith(".thekiharas.com")) {
  baseURL = import.meta.env.VITE_API_BASE
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
