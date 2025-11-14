import { useState, useEffect } from 'react';
import analyticsService from '../services/analyticsService';
import { BarChart3, TrendingUp, AlertCircle, Download, Loader } from 'lucide-react';
import { exportData } from '../utils/exportUtils';
import toast from 'react-hot-toast';
import {
  LineChart,
  BarChart,
  PieChart,
  Line,
  Bar,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [locationData, setLocationData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedReport, setSelectedReport] = useState('sales');
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboard, locations, alertsData] = await Promise.all([
        analyticsService.getDashboard(dateRange),
        analyticsService.getLocationComparison(dateRange),
        analyticsService.getAlerts(dateRange)
      ]);

      setDashboardData(dashboard);
      setLocationData(locations);
      setAlerts(alertsData);
    } catch (err) {
      setError(err.message || 'Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async (reportType) => {
    try {
      setSelectedReport(reportType);
      const report = await analyticsService.getReport(reportType, dateRange);
      setReportData(report);
    } catch (err) {
      console.error('Report error:', err);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExportReport = async (format) => {
    if (!reportData) {
      toast.error('No report data to export');
      return;
    }

    try {
      setIsExporting(true);
      setExportingFormat(format);

      // Prepare data for export based on what's available
      let exportableData = [];
      let columns = [];
      let title = `${selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1)} Report`;
      let filename = `${selectedReport}_report`;

      // Export distribution data if available
      if (reportData.distribution && reportData.distribution.length > 0) {
        exportableData = reportData.distribution;
        columns = [
          { key: 'name', label: 'Category' },
          { key: 'value', label: 'Value' }
        ];
      }
      // Export summary data if available
      else if (reportData.summary) {
        exportableData = Object.entries(reportData.summary).map(([key, value]) => ({
          metric: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          value: value
        }));
        columns = [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' }
        ];
      }

      if (exportableData.length === 0) {
        toast.error('No data available to export');
        return;
      }

      exportData(exportableData, filename, title, columns, format);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(`Failed to export: ${err.message}`);
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const handleExportLocationData = async (format) => {
    if (!locationData || locationData.length === 0) {
      toast.error('No location data to export');
      return;
    }

    try {
      setIsExporting(true);
      setExportingFormat(format);

      const columns = [
        { key: 'name', label: 'Location' },
        { key: 'sales', label: 'Sales' },
        { key: 'tasks', label: 'Tasks Completed' },
        { key: 'revenue', label: 'Revenue' },
        { key: 'efficiency', label: 'Efficiency' }
      ];

      exportData(locationData, 'location_comparison', 'Location Performance Comparison', columns, format);
      toast.success(`Location data exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(`Failed to export: ${err.message}`);
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reporting</h1>
          <p className="text-gray-600 mt-1">Track performance and insights across all locations</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date Range Picker */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Export Location Data Button */}
          {locationData && locationData.length > 0 && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Export Data</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportLocationData('csv')}
                  disabled={isExporting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExporting && exportingFormat === 'csv' ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>CSV</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>CSV</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleExportLocationData('pdf')}
                  disabled={isExporting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExporting && exportingFormat === 'pdf' ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>PDF</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Metrics Cards */}
      {dashboardData?.metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardData.metrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
                  {metric.change && (
                    <p className={`text-sm mt-2 flex items-center ${
                      metric.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${
                  index % 4 === 0 ? 'bg-blue-100' :
                  index % 4 === 1 ? 'bg-green-100' :
                  index % 4 === 2 ? 'bg-yellow-100' : 'bg-purple-100'
                }`}>
                  <BarChart3 className={`h-6 w-6 ${
                    index % 4 === 0 ? 'text-blue-600' :
                    index % 4 === 1 ? 'text-green-600' :
                    index % 4 === 2 ? 'text-yellow-600' : 'text-purple-600'
                  }`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI-Driven Anomaly Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-2">AI-Driven Anomaly Alerts</h3>
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <div key={index} className="text-sm text-yellow-800">
                    <span className="font-medium">{alert.title}:</span> {alert.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Comparison Charts */}
      {locationData && locationData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Location Performance */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={locationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
                <Bar dataKey="tasks" fill="#10b981" name="Tasks Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart - Trend Analysis */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={locationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} name="Efficiency" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Report Generation */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Generation</h2>

        {/* Report Type Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['sales', 'tasks', 'inventory', 'labor', 'operations', 'compliance'].map((reportType) => (
            <button
              key={reportType}
              onClick={() => fetchReport(reportType)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                selectedReport === reportType
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {reportType}
            </button>
          ))}
        </div>

        {/* Report Data Display */}
        {reportData && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              {reportData.distribution && (
                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-3">Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.distribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {reportData.distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Summary Stats */}
              {reportData.summary && (
                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-3">Summary</h3>
                  <div className="space-y-2">
                    {Object.entries(reportData.summary).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export Options */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-md font-semibold text-gray-800 mb-3">Export Options</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleExportReport('pdf')}
                  disabled={isExporting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExporting && exportingFormat === 'pdf' ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Exporting PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Export as PDF</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleExportReport('csv')}
                  disabled={isExporting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExporting && exportingFormat === 'csv' ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Exporting CSV...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Export as CSV</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
