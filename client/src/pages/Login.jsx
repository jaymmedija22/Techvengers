import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import hopeImage from '../assets/hope.jpeg'
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
    <main className="login-page">
      {/* Left side: HOPE image */}
      <section className="login-image-panel">
        <img src={hopeImage} alt="HOPE community at sunset" />

        <div className="login-image-overlay">
          <h1>Hope</h1>
          <p>Building a better future together.</p>
        </div>
      </section>

      {/* Right side: Login form */}
      <section className="login-form-panel">
        <div className="login-brand">
          <div className="login-brand-icon">H</div>
          <div>
            <h2>Hope, Inc.</h2>
            <p>ERP System</p>
          </div>
        </div>

        <div className="login-form-content">
          <h1>Welcome back to Hope!</h1>
          <p className="login-subtitle">
            Sign in to access your account
          </p>

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

            <div className="login-forgot-password">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <div className="login-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="google-login-button"
            disabled
            title="Google sign-in is not configured yet"
          >
            Continue with Google
          </button>

          <p className="login-register-link">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>

        <footer className="login-footer">
          <p>Demo Accounts</p>
          <small>Contact your administrator for account access.</small>
                </footer>
      </section>
    </main>
  )
}

export default Login
