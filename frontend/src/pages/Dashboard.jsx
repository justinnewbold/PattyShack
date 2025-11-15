import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { analyticsService } from '../services/analyticsService';
import { tasksService } from '../services/tasksService';
import { temperaturesService } from '../services/temperaturesService';
import { inventoryService } from '../services/inventoryService';
import { CheckCircle, Clock, AlertTriangle, Package, TrendingUp, Users, DollarSign, Plus, Thermometer, ClipboardList, Calendar, MapPin, Settings } from 'lucide-react';

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

  const handleQuickAction = (action, path) => {
    toast.success(`Opening ${action}...`);
    navigate(path);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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

        {/* Enhanced Quick Actions */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
              <p className="text-sm text-gray-600 mt-1">Common tasks for faster workflows</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Create Task */}
            <button
              onClick={() => handleQuickAction('Tasks', '/tasks')}
              className="group bg-white border-2 border-blue-100 hover:border-blue-500 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
            >
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 group-hover:bg-blue-500 p-2.5 rounded-lg transition-colors">
                  <Plus className="h-5 w-5 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">New Task</h3>
                  <p className="text-xs text-gray-500 mt-1">Create a new task</p>
                </div>
              </div>
            </button>

            {/* Log Temperature */}
            <button
              onClick={() => handleQuickAction('Temperature Log', '/temperatures')}
              className="group bg-white border-2 border-green-100 hover:border-green-500 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
            >
              <div className="flex items-start gap-3">
                <div className="bg-green-100 group-hover:bg-green-500 p-2.5 rounded-lg transition-colors">
                  <Thermometer className="h-5 w-5 text-green-600 group-hover:text-white transition-colors" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">Log Temp</h3>
                  <p className="text-xs text-gray-500 mt-1">Record temperature</p>
                </div>
              </div>
            </button>

            {/* Count Inventory */}
            <button
              onClick={() => handleQuickAction('Inventory Count', '/inventory')}
              className="group bg-white border-2 border-purple-100 hover:border-purple-500 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
            >
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 group-hover:bg-purple-500 p-2.5 rounded-lg transition-colors">
                  <Package className="h-5 w-5 text-purple-600 group-hover:text-white transition-colors" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">Count Stock</h3>
                  <p className="text-xs text-gray-500 mt-1">Update inventory</p>
                </div>
              </div>
            </button>

            {/* View Analytics */}
            <button
              onClick={() => handleQuickAction('Analytics', '/analytics')}
              className="group bg-white border-2 border-indigo-100 hover:border-indigo-500 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
            >
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 group-hover:bg-indigo-500 p-2.5 rounded-lg transition-colors">
                  <TrendingUp className="h-5 w-5 text-indigo-600 group-hover:text-white transition-colors" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Analytics</h3>
                  <p className="text-xs text-gray-500 mt-1">View reports</p>
                </div>
              </div>
            </button>

            {/* View Schedules */}
            <button
              onClick={() => handleQuickAction('Schedules', '/schedules')}
              className="group bg-white border-2 border-orange-100 hover:border-orange-500 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
            >
              <div className="flex items-start gap-3">
                <div className="bg-orange-100 group-hover:bg-orange-500 p-2.5 rounded-lg transition-colors">
                  <Calendar className="h-5 w-5 text-orange-600 group-hover:text-white transition-colors" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">Schedules</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage shifts</p>
                </div>
              </div>
            </button>

            {/* Manage Locations */}
            <button
              onClick={() => handleQuickAction('Locations', '/locations')}
              className="group bg-white border-2 border-teal-100 hover:border-teal-500 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
            >
              <div className="flex items-start gap-3">
                <div className="bg-teal-100 group-hover:bg-teal-500 p-2.5 rounded-lg transition-colors">
                  <MapPin className="h-5 w-5 text-teal-600 group-hover:text-white transition-colors" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">Locations</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage sites</p>
                </div>
              </div>
            </button>

            {/* View All Tasks */}
            <button
              onClick={() => handleQuickAction('All Tasks', '/tasks')}
              className="group bg-white border-2 border-cyan-100 hover:border-cyan-500 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
            >
              <div className="flex items-start gap-3">
                <div className="bg-cyan-100 group-hover:bg-cyan-500 p-2.5 rounded-lg transition-colors">
                  <ClipboardList className="h-5 w-5 text-cyan-600 group-hover:text-white transition-colors" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">All Tasks</h3>
                  <p className="text-xs text-gray-500 mt-1">View all tasks</p>
                </div>
              </div>
            </button>

            {/* Settings */}
            <button
              onClick={() => handleQuickAction('Settings', '/settings')}
              className="group bg-white border-2 border-gray-200 hover:border-gray-500 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
            >
              <div className="flex items-start gap-3">
                <div className="bg-gray-100 group-hover:bg-gray-500 p-2.5 rounded-lg transition-colors">
                  <Settings className="h-5 w-5 text-gray-600 group-hover:text-white transition-colors" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-gray-600 transition-colors">Settings</h3>
                  <p className="text-xs text-gray-500 mt-1">Preferences</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
