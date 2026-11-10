
  import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
  import { AuthProvider } from './AuthContext'
  import Register from './pages/Register'
  import Login from './pages/Login'
  import Home from './pages/Home'
  import SetPassword from './pages/SetPassword'
  import ResetPassword from './pages/ResetPassword'
  import ForgotPassword from './pages/ForgotPassword'
  import UserManagement from './pages/UserManagement'
  import CustomerList from './pages/CustomerList'
  import ProductList from './pages/ProductList'

  function App() {
    return (
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/register" replace />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/home" element={<Home />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/set-password" element={<SetPassword />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    )
  }

  export default App

