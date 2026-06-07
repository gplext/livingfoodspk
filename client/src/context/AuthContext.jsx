import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('lf_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  // On mount, re-validate the stored token with the server
  useEffect(() => {
    const token = localStorage.getItem('lf_token')
    if (!token) { setLoading(false); return }

    api.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('lf_token')
        localStorage.removeItem('lf_user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    const { token, user } = res.data
    localStorage.setItem('lf_token', token)
    localStorage.setItem('lf_user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('lf_token')
    localStorage.removeItem('lf_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
