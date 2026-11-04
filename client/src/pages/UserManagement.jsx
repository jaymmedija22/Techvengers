
import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

function UserManagement() {
  const { user, loading } = useAuth()

  const [users, setUsers] = useState([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add and Edit User form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('User')
  const [saving, setSaving] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  // Refresh the user list.
  async function refreshUsers() {
    const response = await fetch('http://localhost:3000/api/users', {
      credentials: 'include',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Unable to refresh user list.')
    }

    setUsers(data.users)
  }

  // Add a new user.
  async function handleAddUser(event) {
    event.preventDefault()

    try {
      setError('')
      setSuccess('')
      setSaving(true)

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
      setFirstName('')
      setLastName('')
      setEmail('')
      setRole('User')
      setShowAddForm(false)

      await refreshUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Edit an existing user.
  async function handleEditUser(event) {
    event.preventDefault()

    if (!editingUser) return

    try {
      setError('')
      setSuccess('')
      setSaving(true)

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
      setEditingUser(null)
      setFirstName('')
      setLastName('')
      setEmail('')
      setRole('User')
      setShowAddForm(false)

      await refreshUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Block or unblock an existing user.
  async function handleToggleBlock(item) {
    const nextBlockedStatus = !item.isblocked
    const action = nextBlockedStatus ? 'block' : 'unblock'

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${item.firstname} ${item.lastname}?`
    )

    if (!confirmed) return

    try {
      setError('')
      setSuccess('')
      setSaving(true)

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
        throw new Error(data.message || 'Unable to update account status.')
      }

      setSuccess(data.message || 'Account status updated successfully.')

      await refreshUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Load users when the page opens.
  useEffect(() => {
    if (!user || !['Admin', 'Superadmin'].includes(user.role_name)) {
      setFetching(false)
      return
    }

    async function fetchUsers() {
      try {
        await refreshUsers()
      } catch (err) {
        setError(err.message)
      } finally {
        setFetching(false)
      }
    }

    fetchUsers()
  }, [user])

  if (loading) {
    return <div>Checking your session...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!['Admin', 'Superadmin'].includes(user.role_name)) {
    return <Navigate to="/home" replace />
  }

  return (
    <main className="user-management-page">
      <header>
        <Link to="/home">← Back to Dashboard</Link>
        <h1>User Management</h1>
        <p>Manage HOPE ERP user accounts.</p>
      </header>

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}

      {/* Add/Edit User Form */}
      {showAddForm && (
        <section className="add-user-form-section">
          <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>

          <form onSubmit={editingUser ? handleEditUser : handleAddUser}>
            <div>
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
                maxLength={50}
              />
            </div>

            <div>
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
                maxLength={50}
              />
            </div>

            <div>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={255}
              />
            </div>

            <div>
              <label htmlFor="role">Role</label>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="User">User</option>

                {user.role_name === 'Superadmin' && (
                  <option value="Admin">Admin</option>
                )}
              </select>
            </div>

            <button type="submit" disabled={saving}>
              {saving
                ? editingUser
                  ? 'Saving Changes...'
                  : 'Creating...'
                : editingUser
                  ? 'Save Changes'
                  : 'Create User'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setEditingUser(null)
                setFirstName('')
                setLastName('')
                setEmail('')
                setRole('User')
                setError('')
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </form>
        </section>
      )}

      {/* User Accounts Table */}
      <section>
        <div className="user-management-heading">
          <h2>User Accounts</h2>

          <button
            type="button"
            onClick={() => {
              setError('')
              setSuccess('')
              setEditingUser(null)
              setFirstName('')
              setLastName('')
              setEmail('')
              setRole('User')
              setShowAddForm(true)
            }}
          >
            + Add User
          </button>
        </div>

        {fetching ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="user-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Account</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((item) => (
                  <tr key={item.userid}>
                    <td>
                      {item.firstname} {item.lastname}
                    </td>
                    <td>{item.email}</td>
                    <td>{item.role_name}</td>
                    <td>{item.status}</td>
                    <td>{item.isblocked ? 'Blocked' : 'Active'}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(item)
                          setFirstName(item.firstname)
                          setLastName(item.lastname)
                          setEmail(item.email)
                          setRole(item.role_name)
                          setShowAddForm(true)
                          setError('')
                          setSuccess('')
                        }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleBlock(item)}
                        disabled={saving}
                      >
                        {item.isblocked ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

export default UserManagement
