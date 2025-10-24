import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Temperatures from './pages/Temperatures';
import Inventory from './pages/Inventory';
import Schedules from './pages/Schedules';
import Locations from './pages/Locations';
import Analytics from './pages/Analytics';
import Invoices from './pages/Invoices';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Navigate to="/dashboard" replace />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <PrivateRoute>
                <Layout>
                  <Tasks />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/temperatures"
            element={
              <PrivateRoute>
                <Layout>
                  <Temperatures />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <PrivateRoute>
                <Layout>
                  <Inventory />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/schedules"
            element={
              <PrivateRoute>
                <Layout>
                  <Schedules />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/locations"
            element={
              <PrivateRoute>
                <Layout>
                  <Locations />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <PrivateRoute>
                <Layout>
                  <Invoices />
                </Layout>
              </PrivateRoute>
            }
          />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
