import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService';
import { tasksService } from '../services/tasksService';
import { temperaturesService } from '../services/temperaturesService';
import { inventoryService } from '../services/inventoryService';
import { CheckCircle, Clock, AlertTriangle, Package, TrendingUp, Users, DollarSign } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [temperatureAlerts, setTemperatureAlerts] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all dashboard data in parallel
      const [dashboard, tasks, alerts, inventory] = await Promise.all([
        analyticsService.getDashboard().catch(() => ({ stats: {} })),
        tasksService.getTasks({ limit: 5, sort: '-createdAt' }).catch(() => ({ data: [] })),
        temperaturesService.getAlerts({ status: 'active', limit: 5 }).catch(() => ({ data: [] })),
        inventoryService.getItems({ lowStock: true, limit: 5 }).catch(() => ({ data: [] }))
      ]);

      setDashboardData(dashboard);
      setRecentTasks(tasks.data || tasks || []);
      setTemperatureAlerts(alerts.data || alerts || []);
      setLowStockItems(inventory.data || inventory || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-yellow-500',
      high: 'text-orange-500',
      urgent: 'text-red-500'
    };
    return colors[priority] || 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SkeletonLoader type="stats" count={4} />
          </div>

          {/* Content Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="space-y-4">
                <SkeletonLoader type="list-item" count={3} />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="space-y-4">
                <SkeletonLoader type="list-item" count={3} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Tasks */}
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalTasks || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingTasks || 0}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Temperature Alerts */}
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Temperature Alerts</p>
                <p className="text-3xl font-bold text-gray-900">{temperatureAlerts.length}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Low Stock Items */}
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
                <p className="text-3xl font-bold text-gray-900">{lowStockItems.length}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Tasks */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Tasks</h2>
            </div>
            <div className="p-6">
              {recentTasks.length > 0 ? (
                <div className="space-y-4">
                  {recentTasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                            {task.priority && (
                              <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="text-xs text-gray-500">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No recent tasks</p>
              )}
            </div>
          </div>

          {/* Temperature Alerts */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Temperature Alerts</h2>
            </div>
            <div className="p-6">
              {temperatureAlerts.length > 0 ? (
                <div className="space-y-4">
                  {temperatureAlerts.map((alert) => (
                    <div key={alert.id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{alert.equipmentName || 'Equipment Alert'}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Temperature: {alert.temperature}°F
                            {alert.threshold && ` (Threshold: ${alert.threshold}°F)`}
                          </p>
                          {alert.location && (
                            <p className="text-xs text-gray-500 mt-1">{alert.location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No active temperature alerts</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/tasks')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors transform hover:scale-105 transition-smooth"
            >
              <CheckCircle className="h-5 w-5" />
              <span>New Task</span>
            </button>
            <button
              onClick={() => navigate('/temperatures')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors transform hover:scale-105 transition-smooth"
            >
              <TrendingUp className="h-5 w-5" />
              <span>Log Temperature</span>
            </button>
            <button
              onClick={() => navigate('/inventory')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors transform hover:scale-105 transition-smooth"
            >
              <Package className="h-5 w-5" />
              <span>Count Inventory</span>
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors transform hover:scale-105 transition-smooth"
            >
              <DollarSign className="h-5 w-5" />
              <span>View Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
