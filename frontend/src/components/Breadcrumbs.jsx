import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  const formatPathName = (path) => {
    return path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (pathnames.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4" aria-label="Breadcrumb">
      <Link
        to="/dashboard"
        className="flex items-center hover:text-blue-600 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {pathnames.map((path, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return (
          <div key={path} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
            {isLast ? (
              <span className="font-medium text-gray-900">{formatPathName(path)}</span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-blue-600 transition-colors"
              >
                {formatPathName(path)}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
