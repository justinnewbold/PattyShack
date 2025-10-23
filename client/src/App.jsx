import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Private routes */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/temperatures" element={<Temperatures />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/schedules" element={<Schedules />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/invoices" element={<Invoices />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
