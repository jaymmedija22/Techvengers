
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import '../App.css'

function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      setPassword('')
      navigate('/home', { replace: true })
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed.')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return <p>Checking your session...</p>
  }

  if (user) {
    return <Navigate to="/home" replace />
  }

  return (
    <main className="registration-container">
      <div className="registration-card">
        <h1>Sign In</h1>
        <p>Welcome back to HOPE ERP.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <p className="signin-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </main>
  )
}

export default Login
