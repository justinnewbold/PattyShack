import { useState, useEffect } from 'react';
import temperaturesService from '../services/temperaturesService';
import locationsService from '../services/locationsService';
import { Thermometer, AlertTriangle, CheckCircle, X, Plus, Filter } from 'lucide-react';

const Temperatures = () => {
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Form data
  const [logForm, setLogForm] = useState({
    equipment_type: 'freezer',
    equipment_name: '',
    temperature: '',
    location_id: '',
    notes: ''
  });

  const [resolveForm, setResolveForm] = useState({
    resolution_notes: '',
    corrective_action: ''
  });

  useEffect(() => {
    fetchData();
    fetchLocations();
  }, [selectedLocation, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedLocation) filters.location_id = selectedLocation;
      if (startDate) filters.start_date = startDate;
      if (endDate) filters.end_date = endDate;

      const [logsData, alertsData] = await Promise.all([
        temperaturesService.getLogs(filters),
        temperaturesService.getAlerts(filters)
      ]);

      setLogs(logsData);
      setAlerts(alertsData);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch temperature data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await locationsService.getLocations();
      setLocations(data);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      await temperaturesService.createLog({
        ...logForm,
        temperature: parseFloat(logForm.temperature)
      });
      setShowLogModal(false);
      setLogForm({
        equipment_type: 'freezer',
        equipment_name: '',
        temperature: '',
        location_id: '',
        notes: ''
      });
      fetchData();
    } catch (err) {
      alert('Failed to log temperature: ' + (err.message || 'Unknown error'));
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await temperaturesService.acknowledgeAlert(alertId);
      fetchData();
    } catch (err) {
      alert('Failed to acknowledge alert: ' + (err.message || 'Unknown error'));
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    try {
      await temperaturesService.resolveAlert(selectedAlert.id, resolveForm);
      setShowResolveModal(false);
      setSelectedAlert(null);
      setResolveForm({ resolution_notes: '', corrective_action: '' });
      fetchData();
    } catch (err) {
      alert('Failed to resolve alert: ' + (err.message || 'Unknown error'));
    }
  };

  const getEquipmentBadgeColor = (type) => {
    switch (type) {
      case 'freezer':
        return 'bg-blue-100 text-blue-800';
      case 'fridge':
        return 'bg-green-100 text-green-800';
      case 'hot_hold':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    return status === 'in-range'
      ? 'text-green-600'
      : 'text-red-600';
  };

  const getAlertSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-800';
      case 'warning':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Thermometer className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading temperature data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 font-semibold">Error: {error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <Thermometer className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Temperature Monitoring</h1>
          </div>
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Log Temperature
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center mb-3">
            <Filter className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Active Alerts</h2>
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                {alerts.length}
              </span>
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border-l-4 p-4 rounded-lg ${getAlertSeverityColor(alert.severity)}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getEquipmentBadgeColor(alert.equipment_type)}`}>
                          {alert.equipment_type?.toUpperCase()}
                        </span>
                        <span className="ml-2 font-semibold text-gray-900">
                          {alert.equipment_name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        Temperature: <span className="font-bold">{alert.temperature}°F</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        {alert.message}
                      </p>
                      {alert.acknowledged_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Acknowledged at {new Date(alert.acknowledged_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2 mt-3 md:mt-0">
                      {!alert.acknowledged_at && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      {!alert.resolved_at && (
                        <button
                          onClick={() => {
                            setSelectedAlert(alert);
                            setShowResolveModal(true);
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Temperature Logs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Temperature Logs</h2>

          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Thermometer className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No temperature logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Equipment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Temperature
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {log.equipment_name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getEquipmentBadgeColor(log.equipment_type)}`}>
                          {log.equipment_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {log.temperature}°F
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center">
                          {log.status === 'in-range' ? (
                            <CheckCircle className={`w-5 h-5 mr-1 ${getStatusColor(log.status)}`} />
                          ) : (
                            <AlertTriangle className={`w-5 h-5 mr-1 ${getStatusColor(log.status)}`} />
                          )}
                          <span className={`font-medium ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(log.recorded_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Log Temperature Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Log Temperature</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleLogSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Type
                </label>
                <select
                  value={logForm.equipment_type}
                  onChange={(e) => setLogForm({ ...logForm, equipment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="freezer">Freezer</option>
                  <option value="fridge">Fridge</option>
                  <option value="hot_hold">Hot Hold</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Name
                </label>
                <input
                  type="text"
                  value={logForm.equipment_name}
                  onChange={(e) => setLogForm({ ...logForm, equipment_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature (°F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={logForm.temperature}
                  onChange={(e) => setLogForm({ ...logForm, temperature: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  value={logForm.location_id}
                  onChange={(e) => setLogForm({ ...logForm, location_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Log Temperature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Alert Modal */}
      {showResolveModal && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Resolve Alert</h3>
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedAlert(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleResolve} className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Equipment:</strong> {selectedAlert.equipment_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Temperature:</strong> {selectedAlert.temperature}°F
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corrective Action
                </label>
                <textarea
                  value={resolveForm.corrective_action}
                  onChange={(e) => setResolveForm({ ...resolveForm, corrective_action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  required
                  placeholder="What action was taken to resolve this issue?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution Notes
                </label>
                <textarea
                  value={resolveForm.resolution_notes}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolution_notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Additional details about the resolution"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedAlert(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Resolve Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Temperatures;
