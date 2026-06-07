import axios from 'axios'

// All requests go to /api — Vite proxies these to http://localhost:3001
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('lf_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 → clear token and redirect to login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lf_token')
      localStorage.removeItem('lf_user')
      window.location.hash = '#/admin'
    }
    return Promise.reject(err)
  }
)

export default api
