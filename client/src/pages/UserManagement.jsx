
import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import '../App.css'

function UserManagement() {
  const { user, loading, logout } = useAuth()

  const [users, setUsers] = useState([])
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('User')

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')

  const isAdmin = ['Admin', 'Superadmin'].includes(user?.role_name)
  const isSuperadmin = user?.role_name === 'Superadmin'

  const fullName = user
    ? `${user.firstname} ${user.lastname}`
    : ''

  const initial = user?.firstname?.charAt(0).toUpperCase() || 'U'

  const modules = [
    { name: 'Customer', target: '#customer' },
    { name: 'Products', target: '#products' },
    { name: 'Human Resources', target: '#human-resources' },
    { name: 'Sales', target: '#sales' },
    { name: 'Reports', target: '#reports' },
  ]

  // Fetch users
  async function fetchUsers() {
    try {
      setError('')

      const response = await fetch('http://localhost:3000/api/users', {
        method: 'GET',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to retrieve users.')
      }

      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers()
    } else if (!loading) {
      setFetching(false)
    }
  }, [user, loading])

  // Reset form
  function resetForm() {
    setShowForm(false)
    setEditingUser(null)
    setFirstName('')
    setLastName('')
    setEmail('')
    setRole('User')
  }

  // Open Add User form
  function openAddForm() {
    resetForm()
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  // Open Edit User form
  function openEditForm(item) {
    setEditingUser(item)
    setFirstName(item.firstname)
    setLastName(item.lastname)
    setEmail(item.email)
    setRole(item.role_name)
    setError('')
    setSuccess('')
    setShowForm(true)

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Create user
  async function handleAddUser(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const response = await fetch('http://localhost:3000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to create user.')
      }

      setSuccess(data.message || 'User created successfully.')

      resetForm()
      await fetchUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Update user
  async function handleEditUser(event) {
    event.preventDefault()

    if (!editingUser) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const response = await fetch(
        `http://localhost:3000/api/users/${editingUser.userid}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            role,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to update user.')
      }

      setSuccess(data.message || 'User updated successfully.')

      resetForm()
      await fetchUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Block or unblock user
  async function handleToggleBlock(item) {
    const nextBlockedStatus = !item.isblocked
    const action = nextBlockedStatus ? 'block' : 'unblock'

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${item.firstname} ${item.lastname}?`
    )

    if (!confirmed) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const response = await fetch(
        `http://localhost:3000/api/users/${item.userid}/block`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            isBlocked: nextBlockedStatus,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Unable to ${action} account.`)
      }

      setSuccess(data.message || `Account ${action}ed successfully.`)

      await fetchUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Logout
  async function handleLogout() {
    try {
      await logout()
    } catch (err) {
      setError(err.message)
    }
  }

  // Filter users
  const filteredUsers = users.filter((item) => {
    const name = `${item.firstname} ${item.lastname}`.toLowerCase()
    const search = searchTerm.toLowerCase()

    const matchesSearch =
      name.includes(search) ||
      item.email.toLowerCase().includes(search)

    const matchesRole =
      roleFilter === 'All' || item.role_name === roleFilter

    return matchesSearch && matchesRole
  })

  const activeCount = users.filter(
    (item) => !item.isblocked && item.status?.toLowerCase() === 'active'
  ).length

  const blockedCount = users.filter(
    (item) => item.isblocked
  ).length

  if (loading) {
    return <div className="dashboard-loading">Checking your session...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className="dashboard-layout user-management-layout">

      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">

        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">H</div>
          <span>Hope, Inc. ERP</span>
        </div>

        <nav className="sidebar-navigation">
          <Link to="/home" className="sidebar-link">
            Dashboard
          </Link>
        </nav>

        <div className="sidebar-admin-section">
          <span className="sidebar-section-label">
            ADMINISTRATOR
          </span>

          <Link to="/users" className="sidebar-link active">
            User Management
          </Link>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initial}</div>

            <div className="sidebar-user-info">
              <strong>{fullName}</strong>
              <span>{user.role_name}</span>
            </div>
          </div>

          <button
            className="sidebar-logout"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">

        {/* TOP NAVIGATION */}
        <header className="dashboard-topbar">
          <nav className="top-navigation">
            {modules.map((module) => (
              <a href={module.target} key={module.name}>
                {module.name}
              </a>
            ))}
          </nav>

          <span className="topbar-role">
            {user.role_name?.toUpperCase()}
          </span>
        </header>

        <div className="dashboard-content user-management-content">

          {/* PAGE HEADING */}
          <section className="user-page-heading">
            <div>
              <h1>User Management</h1>
              <p>
                Manage user accounts, assign roles, and control system access.
              </p>
            </div>

            <button
              className="user-add-button"
              onClick={openAddForm}
              type="button"
            >
              <span>+</span> Add User
            </button>
          </section>

          {/* MESSAGES */}
          {error && (
            <div className="user-alert user-alert-error" role="alert">
              {error}
              <button onClick={() => setError('')} type="button">×</button>
            </div>
          )}

          {success && (
            <div className="user-alert user-alert-success" role="status">
              {success}
              <button onClick={() => setSuccess('')} type="button">×</button>
            </div>
          )}

          {/* ADD / EDIT FORM */}
          {showForm && (
            <section className="user-form-card">
              <div className="user-form-heading">
                <div>
                  <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
                  <p>
                    {editingUser
                      ? 'Update the account information below.'
                      : 'Enter the details to create a new account.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="user-close-button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  ×
                </button>
              </div>

              <form
                className="user-form-grid"
                onSubmit={editingUser ? handleEditUser : handleAddUser}
              >
                <div className="user-form-field">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    maxLength={50}
                    required
                  />
                </div>

                <div className="user-form-field">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    maxLength={50}
                    required
                  />
                </div>

                <div className="user-form-field">
                  <label htmlFor="userEmail">Email Address</label>
                  <input
                    id="userEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    maxLength={255}
                    required
                  />
                </div>

                <div className="user-form-field">
                  <label htmlFor="userRole">Role</label>
                  <select
                    id="userRole"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="User">User</option>
                    {isSuperadmin && (
                      <option value="Admin">Admin</option>
                    )}
                  </select>
                </div>

                <div className="user-form-actions">
                  <button
                    type="button"
                    className="user-cancel-button"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="user-save-button"
                    disabled={saving}
                  >
                    {saving
                      ? 'Saving...'
                      : editingUser
                        ? 'Save Changes'
                        : 'Create User'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* STATISTICS */}
          <section className="user-summary-grid">
            <div className="user-summary-card">
              <span>Total Users</span>
              <strong>{users.length}</strong>
              <small>Registered accounts</small>
            </div>

            <div className="user-summary-card">
              <span>Active Accounts</span>
              <strong>{activeCount}</strong>
              <small>Currently active</small>
            </div>

            <div className="user-summary-card">
              <span>Blocked Accounts</span>
              <strong>{blockedCount}</strong>
              <small>Restricted accounts</small>
            </div>
          </section>

          {/* USER TABLE */}
          <section className="user-table-card">

            <div className="user-table-heading">
              <div>
                <h2>User Accounts</h2>
                <p>View and manage registered system accounts.</p>
              </div>

              <span className="user-count">
                {filteredUsers.length} users
              </span>
            </div>

            {/* SEARCH AND FILTER */}
            <div className="user-table-controls">
              <div className="user-search">
                <span>⌕</span>
                <input
                  type="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="user-role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="All">All Roles</option>
                <option value="User">User</option>
                {isSuperadmin && (
                  <>
                    <option value="Admin">Admin</option>
                    <option value="Superadmin">Superadmin</option>
                  </>
                )}
              </select>
            </div>

            {fetching ? (
              <div className="user-empty-state">
                Loading user accounts...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="user-empty-state">
                <span>👥</span>
                <h3>No users found</h3>
                <p>Try changing your search or filter.</p>
              </div>
            ) : (
              <div className="user-table-wrapper">
                <table className="user-management-table">
                  <thead>
                    <tr>
                      <th>USER</th>
                      <th>EMAIL ADDRESS</th>
                      <th>ROLE</th>
                      <th>STATUS</th>
                      <th>ACCOUNT</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((item) => (
                      <tr key={item.userid}>
                        <td>
                          <div className="user-name-cell">
                            <div className="user-table-avatar">
                              {item.firstname?.charAt(0).toUpperCase()}
                            </div>

                            <strong>
                              {item.firstname} {item.lastname}
                            </strong>
                          </div>
                        </td>

                        <td>{item.email}</td>

                        <td>
                          <span
                            className={`user-role-badge ${
                              item.role_name?.toLowerCase()
                            }`}
                          >
                            {item.role_name}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`user-status-badge ${
                              item.status?.toLowerCase() === 'active'
                                ? 'active'
                                : 'inactive'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`user-account-badge ${
                              item.isblocked ? 'blocked' : 'unblocked'
                            }`}
                          >
                            {item.isblocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>

                        <td>
                          <div className="user-action-buttons">
                            <button
                              type="button"
                              className="user-edit-button"
                              onClick={() => openEditForm(item)}
                              disabled={saving}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className={
                                item.isblocked
                                  ? 'user-unblock-button'
                                  : 'user-block-button'
                              }
                              onClick={() => handleToggleBlock(item)}
                              disabled={saving}
                            >
                              {item.isblocked ? 'Unblock' : 'Block'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="user-table-footer">
              Showing {filteredUsers.length} of {users.length} accounts
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

export default UserManagement
