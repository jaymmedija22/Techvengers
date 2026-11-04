import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

const API_URL = 'http://localhost:3000/api/auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check whether the user already has an active session.
  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const response = await fetch(`${API_URL}/me`, {
          method: 'GET',
          credentials: 'include',
        })

        if (!response.ok) {
          if (active) setUser(null)
          return
        }

        const data = await response.json()

        if (active) {
          setUser(data.user)
        }
      } catch (error) {
        console.error('Session check failed:', error)

        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    checkSession()

    return () => {
      active = false
    }
  }, [])

  // Log in and save the authenticated user.
  async function login(email, password) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Login failed.')
    }

    setUser(data.user)

    return data
  }

  // Log out and clear the authenticated user.
  async function logout() {
    const response = await fetch(`${API_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Logout failed.')
    }

    setUser(null)

    return data
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}