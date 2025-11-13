import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Temperatures = lazy(() => import('./pages/Temperatures'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Schedules = lazy(() => import('./pages/Schedules'));
const Locations = lazy(() => import('./pages/Locations'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

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
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </>
  );
};

export default App;
