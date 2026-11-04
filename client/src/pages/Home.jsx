    import { useState } from 'react'
    import { Navigate } from 'react-router-dom'
    import { useAuth } from '../AuthContext'

    function Home() {
    const { user, loading, logout } = useAuth()
    const [error, setError] = useState('')

    async function handleLogout() {
        try {
        setError('')
        await logout()
        } catch (err) {
        setError(err.message)
        }
    }

    if (loading) {
        return <p>Checking your session...</p>
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return (
        <main>
        <h1>HOPE ERP Dashboard</h1>

        <p>Welcome, {user.firstname} {user.lastname}!</p>
        <p>Email: {user.email}</p>
        <p>Role: {user.role_name}</p>

        {error && <p role="alert">{error}</p>}

        <button onClick={handleLogout}>
            Log Out
        </button>
        </main>
    )
    }

    export default Home