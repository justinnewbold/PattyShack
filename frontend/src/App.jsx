import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Temperatures from './pages/Temperatures';
import Inventory from './pages/Inventory';
import Schedules from './pages/Schedules';
import Locations from './pages/Locations';
import Analytics from './pages/Analytics';
import Invoices from './pages/Invoices';
import Login from './pages/Login';
import Register from './pages/Register';

const renderProtectedRoute = (Component) => (
  <PrivateRoute>
    <Layout>
      <Component />
    </Layout>
  </PrivateRoute>
);

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading PattyShack...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <Register />}
      />
      <Route path="/dashboard" element={renderProtectedRoute(Dashboard)} />
      <Route path="/tasks" element={renderProtectedRoute(Tasks)} />
      <Route path="/temperatures" element={renderProtectedRoute(Temperatures)} />
      <Route path="/inventory" element={renderProtectedRoute(Inventory)} />
      <Route path="/schedules" element={renderProtectedRoute(Schedules)} />
      <Route path="/locations" element={renderProtectedRoute(Locations)} />
      <Route path="/analytics" element={renderProtectedRoute(Analytics)} />
      <Route path="/invoices" element={renderProtectedRoute(Invoices)} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

export default App;
