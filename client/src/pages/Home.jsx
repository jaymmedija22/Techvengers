
import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
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
    return <div className="dashboard-loading">Checking your session...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const fullName = `${user.firstname} ${user.lastname}`
  const initial = user.firstname?.charAt(0).toUpperCase() || 'U'
  const isAdmin = ['Admin', 'Superadmin'].includes(user.role_name)

  const modules = [
    { name: 'Customer', icon: '👥', target: '/customers' },
    { name: 'Products', icon: '📦', target: '#products' },
    { name: 'Human Resources', icon: '👨‍💼', target: '#human-resources' },
    { name: 'Sales', icon: '📈', target: '#sales' },
    { name: 'Reports', icon: '📊', target: '#reports' },
  ]

  const actions = [
    { name: 'View Customer', icon: '👥', target: '/customers' },
    { name: 'Manage Products', icon: '📦', target: '#products' },
    { name: 'Human Resources', icon: '👨‍💼', target: '#human-resources' },
    { name: 'Sales Pipeline', icon: '📈', target: '#sales' },
    { name: 'Reports', icon: '📊', target: '#reports' },
    ...(isAdmin
      ? [{ name: 'Manage Users', icon: '🔐', target: '#user-management' }]
      : []),
  ]

  return (
    <div className="dashboard-layout">

      {/* LEFT SIDEBAR */}
      <aside className="dashboard-sidebar">

        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">H</div>
          <span>Hope, Inc. ERP</span>
        </div>

        <nav className="sidebar-navigation">
          <a href="/home" className="sidebar-link active">
            Dashboard
          </a>
        </nav>

        {isAdmin && (
          <div className="sidebar-admin-section">
            <span className="sidebar-section-label">ADMINISTRATOR</span>
            <Link to="/users" className="sidebar-link">
  User Management
</Link>
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initial}</div>
            <div className="sidebar-user-info">
              <strong>{fullName}</strong>
              <span>{user.role_name}</span>
            </div>
          </div>

          <button className="sidebar-logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </aside>

      {/* MAIN DASHBOARD */}
      <main className="dashboard-main">

        {/* TOP NAVIGATION */}
        <header className="dashboard-topbar">

          <nav className="top-navigation">
            {modules.map((module) => (
              <a key={module.name} href={module.target}>
                {module.name}
              </a>
            ))}
          </nav>

          <span className="topbar-role">
            {user.role_name?.toUpperCase()}
          </span>

        </header>

        <div className="dashboard-content">

          {error && (
            <p className="dashboard-error" role="alert">
              {error}
            </p>
          )}

          {/* WELCOME BANNER */}
          <section className="dashboard-welcome">
            <h1>Welcome back, {user.firstname}!</h1>
            <p>
              You have full system access. You can manage all modules
              and assign roles to any user.
            </p>
          </section>

          {/* STATISTICS */}
          <section className="dashboard-stats">

            <div className="dashboard-stat-card">
              <div className="stat-details">
                <span>Total Customers</span>
                <strong>4</strong>
                <small>1 Inactive</small>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="stat-details">
                <span>Products</span>
                <strong>386</strong>
                <small>5 new this week</small>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="stat-details">
                <span>Open Orders</span>
                <strong>94</strong>
                <small>8% vs last week</small>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="stat-details">
                <span>Revenue (MTD)</span>
                <strong>$84.2K</strong>
                <small>18% vs last week</small>
              </div>
            </div>

          </section>

          {/* QUICK ACTIONS */}
          <section className="quick-actions-section" id="quick-actions">

            <h2>Quick Actions</h2>

           <div className="quick-actions-grid">
  {actions.map((action) =>
    action.name === 'Manage Users' ? (
      <Link
        to="/users"
        className="quick-action-card"
        key={action.name}
      >
        <span>{action.icon}</span>
        {action.name}
      </Link>
    ) : (
      <a
        href={action.target}
        className="quick-action-card"
        key={action.name}
      >
        <span>{action.icon}</span>
        {action.name}
      </a>
    )
  )}
</div>

          </section>

        </div>
      </main>
    </div>
  )
}

export default Home
