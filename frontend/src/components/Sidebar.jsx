import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Thermometer,
  Package,
  Calendar,
  MapPin,
  BarChart3,
  FileText,
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/temperatures', icon: Thermometer, label: 'Temperatures' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/schedules', icon: Calendar, label: 'Schedules' },
    { path: '/locations', icon: MapPin, label: 'Locations' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/invoices', icon: FileText, label: 'Invoices' },
  ];

  const linkClasses = ({ isActive }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg transform scale-105'
        : 'text-gray-700 hover:bg-gray-100 hover:translate-x-1'
    }`;

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white shadow-lg z-30 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <nav className="h-full overflow-y-auto p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={linkClasses}
                    onClick={() => {
                      // Close sidebar on mobile after clicking a link
                      if (window.innerWidth < 768) {
                        toggleSidebar();
                      }
                    }}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
