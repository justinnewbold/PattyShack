import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CheckCircle, Thermometer, Package, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksService } from '../services/tasksService';
import { inventoryService } from '../services/inventoryService';
import { temperaturesService } from '../services/temperaturesService';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    tasks: [],
    inventory: [],
    temperatures: []
  });
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = searchRef.current?.querySelector('input');
        if (searchInput) {
          searchInput.focus();
          toast.success('Press ESC to close search');
        }
      }
      // ESC to close search
      if (event.key === 'Escape') {
        setIsOpen(false);
        const searchInput = searchRef.current?.querySelector('input');
        if (searchInput === document.activeElement) {
          searchInput.blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults({ tasks: [], inventory: [], temperatures: [] });
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    setIsOpen(true);

    try {
      const searchPromises = [
        tasksService.getTasks({ search: query, limit: 5 }).catch(() => ({ data: [] })),
        inventoryService.getItems({ search: query, limit: 5 }).catch(() => ({ data: [] })),
        temperaturesService.getTemperatures({ search: query, limit: 5 }).catch(() => ({ data: [] }))
      ];

      const [tasksResponse, inventoryResponse, temperaturesResponse] = await Promise.all(searchPromises);

      setResults({
        tasks: tasksResponse.data || tasksResponse || [],
        inventory: inventoryResponse.data || inventoryResponse || [],
        temperatures: temperaturesResponse.data || temperaturesResponse || []
      });
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (type, id) => {
    setIsOpen(false);
    setQuery('');
    toast.success('Navigating...');

    switch (type) {
      case 'task':
        navigate('/tasks');
        break;
      case 'inventory':
        navigate('/inventory');
        break;
      case 'temperature':
        navigate('/temperatures');
        break;
      default:
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults({ tasks: [], inventory: [], temperatures: [] });
    setIsOpen(false);
  };

  const totalResults = results.tasks.length + results.inventory.length + results.temperatures.length;
  const hasResults = totalResults > 0;

  return (
    <div ref={searchRef} className="relative flex-1 max-w-lg mx-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search... (Ctrl+K or ⌘K)"
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-center">
              <Loader className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
              <p className="text-sm text-gray-600 mt-2">Searching...</p>
            </div>
          ) : hasResults ? (
            <div className="py-2">
              {/* Tasks Results */}
              {results.tasks.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Tasks ({results.tasks.length})
                  </div>
                  {results.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleResultClick('task', task.id)}
                      className="w-full px-4 py-3 hover:bg-gray-50 flex items-start gap-3 text-left transition-colors"
                    >
                      <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-gray-500 truncate">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Inventory Results */}
              {results.inventory.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Inventory ({results.inventory.length})
                  </div>
                  {results.inventory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick('inventory', item.id)}
                      className="w-full px-4 py-3 hover:bg-gray-50 flex items-start gap-3 text-left transition-colors"
                    >
                      <Package className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        {item.sku && (
                          <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">
                            Qty: {item.quantity || 0} {item.unit || ''}
                          </span>
                          {item.quantity <= (item.minQuantity || 0) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Temperature Results */}
              {results.temperatures.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Temperatures ({results.temperatures.length})
                  </div>
                  {results.temperatures.map((temp) => (
                    <button
                      key={temp.id}
                      onClick={() => handleResultClick('temperature', temp.id)}
                      className="w-full px-4 py-3 hover:bg-gray-50 flex items-start gap-3 text-left transition-colors"
                    >
                      <Thermometer className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {temp.equipmentName || temp.equipment || 'Equipment'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">
                            {temp.temperature}°F
                          </span>
                          {temp.location && (
                            <span className="text-xs text-gray-500">• {temp.location}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No results found for "{query}"</p>
              <p className="text-xs text-gray-500 mt-1">Try a different search term</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
