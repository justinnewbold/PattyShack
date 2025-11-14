import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, User, LogOut, Search, Settings } from 'lucide-react';
import GlobalSearch from './GlobalSearch';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-30 h-16">
      <div className="flex items-center justify-between h-full px-4 md:px-6 gap-4">
        {/* Left section - Menu button and Logo */}
        <div className="flex items-center space-x-4 flex-shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          <div className="flex items-center">
            <h1 className="text-xl md:text-2xl font-bold text-blue-600">
              PattyShack
            </h1>
          </div>
        </div>

        {/* Middle section - Global Search */}
        <div className="hidden md:flex flex-1 max-w-2xl">
          <GlobalSearch />
        </div>

        {/* Right section - User info and logout */}
        <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
          {/* Mobile Search Button */}
          <button
            onClick={() => setShowMobileSearch(true)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search"
          >
            <Search className="h-6 w-6 text-gray-600" />
          </button>

          <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-50">
            <User className="h-5 w-5 text-gray-600" />
            <span className="hidden sm:inline text-sm md:text-base font-medium text-gray-700">
              {user?.name || user?.email}
            </span>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-2 rounded-md bg-red-50 hover:bg-red-100 text-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline text-sm md:text-base font-medium">
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Search Modal */}
      {showMobileSearch && (
        <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Search</h2>
            <button
              onClick={() => setShowMobileSearch(false)}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Close search"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <GlobalSearch />
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
