
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import '../App.css'

function SetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    setMessage('')
    setError('')

    if (!token) {
      setError('The account setup token is missing.')
      return
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        'http://localhost:3000/api/auth/set-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, password }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Password setup failed.')
        return
      }

      setMessage(data.message || 'Password setup completed.')
      setPassword('')
      setConfirmPassword('')

      // Remove the token from the browser URL.
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Password setup error:', err)
      setError('Unable to connect to the server. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="registration-container">
      <div className="registration-card">
        <h1>Set Up Your Password</h1>
        <p>Create a password to access HOPE ERP.</p>

        {!token && (
          <p className="error-message" role="alert">
            The account setup token is missing.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="password">New Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your new password"
            minLength={8}
            required
          />

          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            minLength={8}
            required
          />

          <button type="submit" disabled={isLoading || !token}>
            {isLoading ? 'Saving password...' : 'Set Password'}
          </button>
        </form>

        {message && (
          <p className="success-message" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <p className="signin-link">
          Already have a password? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </main>
  )
}

export default SetPassword
