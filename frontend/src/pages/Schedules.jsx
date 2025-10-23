import { useState, useEffect } from 'react';
import schedulesService from '../services/schedulesService';
import { Calendar, Clock, Users, Plus, X, Filter, TrendingUp } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, addDays } from 'date-fns';

const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showForecast, setShowForecast] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    startDate: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfWeek(new Date()), 'yyyy-MM-dd'),
    locationId: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    locationId: '',
    scheduleDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '',
    endTime: '',
    position: '',
  });

  useEffect(() => {
    fetchSchedules();
  }, [filters]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await schedulesService.getSchedules(filters);
      setSchedules(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch schedules');
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchForecast = async () => {
    try {
      const data = await schedulesService.getForecast(filters);
      setForecast(data);
      setShowForecast(true);
    } catch (err) {
      console.error('Error fetching forecast:', err);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await schedulesService.createSchedule(formData);
      setShowCreateModal(false);
      setFormData({
        employeeId: '',
        locationId: '',
        scheduleDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
        position: '',
      });
      fetchSchedules();
    } catch (err) {
      setError(err.message || 'Failed to create schedule');
    }
  };

  const handleClockIn = async (scheduleId) => {
    try {
      await schedulesService.clockIn({ scheduleId });
      fetchSchedules();
    } catch (err) {
      setError(err.message || 'Failed to clock in');
    }
  };

  const handleClockOut = async (scheduleId) => {
    try {
      await schedulesService.clockOut({ scheduleId });
      fetchSchedules();
    } catch (err) {
      setError(err.message || 'Failed to clock out');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Scheduled' },
      clocked_in: { bg: 'bg-green-100', text: 'text-green-800', label: 'Clocked In' },
      clocked_out: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Clocked Out' },
      no_show: { bg: 'bg-red-100', text: 'text-red-800', label: 'No Show' },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-8 h-8" />
              Employee Schedules
            </h1>
            <p className="text-gray-600 mt-1">Manage employee schedules and time tracking</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchForecast}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Labor Forecast
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Schedule
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Toggle & Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* View Mode */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Calendar View
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <input
              type="text"
              placeholder="Location ID"
              value={filters.locationId}
              onChange={(e) => setFilters({ ...filters, locationId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading schedules...</p>
        </div>
      ) : (
        <>
          {/* List View */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                          No schedules found
                        </td>
                      </tr>
                    ) : (
                      schedules.map((schedule) => (
                        <tr key={schedule.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Users className="w-5 h-5 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">
                                {schedule.employeeName || `Employee #${schedule.employeeId}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(parseISO(schedule.scheduleDate), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Clock className="w-4 h-4 text-gray-400 mr-1" />
                              {schedule.startTime} - {schedule.endTime}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {schedule.position || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(schedule.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {schedule.status === 'scheduled' && (
                              <button
                                onClick={() => handleClockIn(schedule.id)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                              >
                                Clock In
                              </button>
                            )}
                            {schedule.status === 'clocked_in' && (
                              <button
                                onClick={() => handleClockOut(schedule.id)}
                                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                              >
                                Clock Out
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedules.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    No schedules found for this date range
                  </div>
                ) : (
                  schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-gray-900">
                            {schedule.employeeName || `Employee #${schedule.employeeId}`}
                          </h3>
                        </div>
                        {getStatusBadge(schedule.status)}
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(parseISO(schedule.scheduleDate), 'EEEE, MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                        {schedule.position && (
                          <div className="text-gray-700 font-medium">
                            Position: {schedule.position}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        {schedule.status === 'scheduled' && (
                          <button
                            onClick={() => handleClockIn(schedule.id)}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                          >
                            Clock In
                          </button>
                        )}
                        {schedule.status === 'clocked_in' && (
                          <button
                            onClick={() => handleClockOut(schedule.id)}
                            className="flex-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm"
                          >
                            Clock Out
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create New Schedule</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateSchedule}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location ID
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.scheduleDate}
                    onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Labor Forecast Modal */}
      {showForecast && forecast && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                Labor Forecast
              </h2>
              <button
                onClick={() => setShowForecast(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total Hours</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {forecast.totalHours || 0}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Total Cost</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">
                    ${forecast.totalCost || 0}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Employees</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {forecast.employeeCount || 0}
                  </div>
                </div>
              </div>
              {forecast.details && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Forecast Details</h3>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
                    {JSON.stringify(forecast.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedules;
