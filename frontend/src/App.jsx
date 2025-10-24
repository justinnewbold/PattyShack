import { Navigate, Routes, Route } from 'react-router-dom'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Inventory from './pages/Inventory'
import Locations from './pages/Locations'
import Invoices from './pages/Invoices'
import Schedules from './pages/Schedules'
import Tasks from './pages/Tasks'
import Temperatures from './pages/Temperatures'
import { useAuth } from './context/AuthContext'

const App = () => {
  const { loading, user } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600 text-lg font-medium">Loading...</p>
      </div>
    )
  }

  const defaultPath = user ? '/dashboard' : '/login'
  const renderProtectedRoute = (Component) => (
    <PrivateRoute>
      <Layout>
        <Component />
      </Layout>
    </PrivateRoute>
  )

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultPath} replace />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <Register />}
      />
      <Route path="/dashboard" element={renderProtectedRoute(Dashboard)} />
      <Route path="/analytics" element={renderProtectedRoute(Analytics)} />
      <Route path="/inventory" element={renderProtectedRoute(Inventory)} />
      <Route path="/locations" element={renderProtectedRoute(Locations)} />
      <Route path="/invoices" element={renderProtectedRoute(Invoices)} />
      <Route path="/schedules" element={renderProtectedRoute(Schedules)} />
      <Route path="/tasks" element={renderProtectedRoute(Tasks)} />
      <Route path="/temperatures" element={renderProtectedRoute(Temperatures)} />
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  )
}

export default App
