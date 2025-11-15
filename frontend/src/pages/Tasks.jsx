import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { tasksService } from '../services/tasksService';
import { CheckCircle, Clock, AlertCircle, Plus, X, Filter, Trash2, Download } from 'lucide-react';
import ExportButton from '../components/ExportButton';
import FilterPanel from '../components/FilterPanel';
import { exportTasks } from '../utils/exportUtils';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [filterPresets, setFilterPresets] = useState(() => {
    const saved = localStorage.getItem('task_filter_presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
    locationId: '',
    assignedTo: ''
  });

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build filter params for backend
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.location) params.locationId = filters.location;

      const response = await tasksService.getTasks(params);
      let tasksData = response.data || response || [];

      // Apply client-side filters
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        tasksData = tasksData.filter(task =>
          task.title?.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        tasksData = tasksData.filter(task =>
          task.dueDate && new Date(task.dueDate) >= fromDate
        );
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        tasksData = tasksData.filter(task =>
          task.dueDate && new Date(task.dueDate) <= toDate
        );
      }

      setTasks(tasksData);
    } catch (err) {
      const errorMsg = err.message || 'Failed to load tasks';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await tasksService.createTask(newTask);
      setShowCreateModal(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        dueDate: '',
        locationId: '',
        assignedTo: ''
      });
      toast.success('Task created successfully');
      fetchTasks();
    } catch (err) {
      toast.error(err.message || 'Failed to create task');
      console.error('Create task error:', err);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await tasksService.completeTask(taskId);
      toast.success('Task marked as complete');
      fetchTasks();
    } catch (err) {
      toast.error(err.message || 'Failed to complete task');
      console.error('Complete task error:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    try {
      await tasksService.deleteTask(taskId);
      toast.success('Task deleted successfully');
      fetchTasks();
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
      console.error('Delete task error:', err);
    }
  };

  const toggleTaskSelection = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedTasks.size === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedTasks.size} task(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedTasks).map(id => tasksService.deleteTask(id))
      );
      toast.success(`${selectedTasks.size} task(s) deleted successfully`);
      setSelectedTasks(new Set());
      fetchTasks();
    } catch (err) {
      toast.error('Failed to delete some tasks');
      console.error('Batch delete error:', err);
    }
  };

  const handleBatchExport = (format) => {
    const selectedTasksData = tasks.filter(t => selectedTasks.has(t.id));
    exportTasks(selectedTasksData, format);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      location: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
  };

  const handleSavePreset = (preset) => {
    const newPreset = {
      ...preset,
      id: Date.now().toString()
    };
    const updated = [...filterPresets, newPreset];
    setFilterPresets(updated);
    localStorage.setItem('task_filter_presets', JSON.stringify(updated));
  };

  const handleLoadPreset = (filters) => {
    setFilters(filters);
  };

  const handleDeletePreset = (presetId) => {
    const updated = filterPresets.filter(p => p.id !== presetId);
    setFilterPresets(updated);
    localStorage.setItem('task_filter_presets', JSON.stringify(updated));
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityBadgeColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700 border-gray-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      urgent: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {tasks.length > 0 && (
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTasks.size === tasks.length && tasks.length > 0}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-600">
                  Select All ({selectedTasks.size}/{tasks.length})
                </span>
              </label>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
              <p className="text-gray-600 mt-2">Manage and track your tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton
              data={tasks}
              onExportCSV={() => exportTasks(tasks, 'csv')}
              onExportPDF={() => exportTasks(tasks, 'pdf')}
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mb-6">
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            savedPresets={filterPresets}
            onSavePreset={handleSavePreset}
            onDeletePreset={handleDeletePreset}
            onLoadPreset={handleLoadPreset}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className={`bg-white rounded-lg shadow hover:shadow-lg transition-all ${selectedTasks.has(task.id) ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="p-6">
                  {/* Task Header with Checkbox */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Task Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadgeColor(task.status)}`}>
                      {task.status}
                    </span>
                    {task.priority && (
                      <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityBadgeColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>

                  {/* Task Details */}
                  <div className="space-y-2 mb-4">
                    {task.dueDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {task.assignedTo && (
                      <div className="text-sm text-gray-600">
                        Assigned to: {task.assignedTo}
                      </div>
                    )}
                    {task.locationId && (
                      <div className="text-sm text-gray-600">
                        Location: {task.locationId}
                      </div>
                    )}
                  </div>

                  {/* Task Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    {task.status !== 'completed' && (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Complete</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No tasks found</p>
              <p className="text-gray-400 text-sm mt-2">Create a new task to get started</p>
            </div>
          )}
        </div>

        {/* Batch Actions Bar */}
        {selectedTasks.size > 0 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
            <div className="bg-gray-900 text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4">
              <span className="font-medium">
                {selectedTasks.size} task(s) selected
              </span>
              <div className="h-6 w-px bg-gray-700" />
              <button
                onClick={() => handleBatchExport('csv')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handleBatchExport('pdf')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
              <button
                onClick={() => setSelectedTasks(new Set())}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create New Task</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreateTask} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter task title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter task description"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={newTask.status}
                        onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                      <input
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location ID</label>
                      <input
                        type="text"
                        value={newTask.locationId}
                        onChange={(e) => setNewTask({ ...newTask, locationId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter location ID"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                    <input
                      type="text"
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter assignee name or ID"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Create Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
