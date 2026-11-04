
import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

function Register() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    setMessage('')
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Registration failed.')
        return
      }

      setMessage(data.message)
      setFirstName('')
      setLastName('')
      setEmail('')
    } catch (err) {
      console.error('Registration error:', err)
      setError('Unable to connect to the server. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="registration-container">
      <div className="registration-card">
        <h1>Create an Account</h1>
        <p>Register to get started with HOPE ERP.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            placeholder="Enter your first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />

          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            placeholder="Enter your last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />

          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
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
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </main>
  )
}

export default Register
