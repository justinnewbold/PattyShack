import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useKeyboardShortcuts();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <Navbar toggleSidebar={toggleSidebar} />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 ml-0 md:ml-64 mt-16 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal />
    </div>
  );
};

export default Layout;
