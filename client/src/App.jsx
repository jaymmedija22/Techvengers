
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Register from './pages/Register'
import Login from './pages/Login'
import Home from './pages/Home'
import SetPassword from './pages/SetPassword'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/set-password" element={<SetPassword />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
