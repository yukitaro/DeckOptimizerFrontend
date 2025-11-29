import axios from 'axios'

const host = typeof window !== "undefined" ? window.location.hostname : "";

const isProd = import.meta.env.PROD

let baseURL = 'http://192.168.4.46' //import.meta.env.VITE_API_BASE_URL
let baseSymbolUrl = import.meta.env.VITE_SYMBOL_BASE_URL || '/storage' // default fallback

if (host === "deck.thekiharas.com" || host.endsWith(".thekiharas.com") || isProd) {
  baseURL = import.meta.env.VITE_API_BASE
  baseSymbolUrl = import.meta.env.VITE_API_SYMBOL_BASE
} else if (host.includes('192.168.4.46')) {
  baseURL = import.meta.env.VITE_API_BASE_URL
  console.log('setting baseURL to local dev:', baseURL)
  baseSymbolUrl = import.meta.env.VITE_SYMBOL_BASE_URL
} if (host.includes('192.168.4.161')) {
  baseURL = import.meta.env.VITE_API_BASE_URL
  baseSymbolUrl = import.meta.env.VITE_SYMBOL_BASE_URL
} else if (host.includes('98.164.213.139')) {
  baseURL = import.meta.env.VITE_API_BASE_URL_WAN
  baseSymbolUrl = import.meta.env.VITE_SYMBOL_BASE_URL_WAN
} else if (host === "deck.thekiharas.com" || host.endsWith(".thekiharas.com")) {
  baseURL = import.meta.env.VITE_API_BASE
  baseSymbolUrl = import.meta.env.VITE_API_SYMBOL_BASE
} else {
  baseURL = import.meta.env.VITE_API_BASE_URL_WAN
  baseSymbolUrl = import.meta.env.VITE_SYMBOL_BASE_URL
}

console.log('host is : ' + host)

export const laravel_api = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: 'application/json'
  },
})

export const symbol_api = `${baseSymbolUrl}`