import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Development mode
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

  const demoAccounts = [
    { role: 'Corporate', email: 'justin@pattyshack.com', icon: '👑', color: 'from-purple-500 to-purple-600' },
    { role: 'Regional', email: 'regional@pattyshack.com', icon: '🌎', color: 'from-blue-500 to-blue-600' },
    { role: 'District', email: 'district@pattyshack.com', icon: '🏢', color: 'from-green-500 to-green-600' },
    { role: 'Manager', email: 'manager@pattyshack.com', icon: '👔', color: 'from-orange-500 to-orange-600' },
    { role: 'Crew', email: 'crew@pattyshack.com', icon: '👨‍🍳', color: 'from-red-500 to-red-600' }
  ];

  const quickLogin = async (email) => {
    setLoading(true);
    setError('');

    try {
      const result = await login({
        username: email,
        password: '123456'
      });

      if (result.success) {
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        toast.error(result.error || 'Quick login failed.');
        setError(result.error || 'Quick login failed.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('Username or email is required');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login({
        username: formData.username,
        password: formData.password
      });

      if (result.success) {
        toast.success('Login successful!');
        navigate('/dashboard');
      } else {
        const errorMsg = result.error || 'Login failed. Please check your credentials.';
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred. Please try again.';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-sm w-full relative z-10 animate-fadeIn">
        {/* Logo and Header */}
        <div className="text-center mb-6 animate-slideDown">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-xl mb-3 shadow-xl transform hover:scale-105 transition-transform duration-300">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            PattyShack
          </h1>
          <p className="text-gray-600 text-sm font-medium">Restaurant Operations Platform</p>
          <p className="text-gray-500 text-xs mt-1">Welcome back! Sign in to continue</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50 animate-slideUp">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm animate-shake">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Dev Mode Quick Login */}
            {isDevMode && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold text-yellow-700">DEV MODE - Quick Login</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.role}
                      type="button"
                      onClick={() => quickLogin(account.email)}
                      disabled={loading}
                      className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r ${account.color} text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium`}
                    >
                      <span className="flex items-center">
                        <span className="text-lg mr-2">{account.icon}</span>
                        <span>{account.role}</span>
                      </span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-yellow-600 mt-3 text-center">
                  Click any role to login instantly (password: 123456)
                </p>
              </div>
            )}

            {/* Username/Email Field */}
            <div className="group">
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-orange-600 transition-colors">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none hover:border-gray-300"
                  placeholder="Enter your username or email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="group">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-orange-600 transition-colors">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none hover:border-gray-300"
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-orange-600 hover:via-orange-700 hover:to-red-700 focus:outline-none focus:ring-4 focus:ring-orange-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </span>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">New to PattyShack?</span>
              </div>
            </div>
            <Link
              to="/register"
              className="mt-4 inline-flex items-center text-orange-600 hover:text-orange-700 font-semibold transition-all hover:underline decoration-2 underline-offset-4"
            >
              Create a free account
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500 animate-fadeIn">
          <p className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Secure & Encrypted
          </p>
          <p className="mt-2">&copy; 2024 PattyShack. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
