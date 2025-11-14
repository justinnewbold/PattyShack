import { usePreferences } from '../context/UserPreferencesContext';
import { Settings as SettingsIcon, Moon, Sun, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const {
    preferences,
    updatePreference,
    updateNestedPreference,
    resetPreferences,
    toggleTheme,
    toggleExportFormat
  } = usePreferences();

  const handleResetPreferences = () => {
    if (window.confirm('Are you sure you want to reset all preferences to default? This cannot be undone.')) {
      resetPreferences();
      toast.success('Preferences reset to default');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your preferences and application settings</p>
        </div>
        <button
          onClick={handleResetPreferences}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reset to Default
        </button>
      </div>

      {/* Theme Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          {preferences.theme === 'light' ? (
            <Sun className="h-6 w-6 text-yellow-500" />
          ) : (
            <Moon className="h-6 w-6 text-blue-500" />
          )}
          <h2 className="text-xl font-semibold text-gray-900">Appearance</h2>
        </div>

        <div className="space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Theme</p>
              <p className="text-sm text-gray-600">Choose your preferred theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Default View */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Default View</p>
              <p className="text-sm text-gray-600">Choose how lists are displayed by default</p>
            </div>
            <select
              value={preferences.defaultView}
              onChange={(e) => updatePreference('defaultView', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>
          </div>

          {/* Date Format */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Date Format</p>
              <p className="text-sm text-gray-600">Choose your preferred date format</p>
            </div>
            <select
              value={preferences.dateFormat}
              onChange={(e) => updatePreference('dateFormat', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Download className="h-6 w-6 text-green-500" />
          <h2 className="text-xl font-semibold text-gray-900">Export Preferences</h2>
        </div>

        <div className="space-y-4">
          {/* Export Format */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Default Export Format</p>
              <p className="text-sm text-gray-600">Choose your preferred export format</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updatePreference('exportFormat', 'csv')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  preferences.exportFormat === 'csv'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => updatePreference('exportFormat', 'pdf')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  preferences.exportFormat === 'pdf'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <SettingsIcon className="h-6 w-6 text-purple-500" />
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
        </div>

        <div className="space-y-4">
          {/* Enable Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Enable Notifications</p>
              <p className="text-sm text-gray-600">Receive toast notifications in the app</p>
            </div>
            <button
              onClick={() => updateNestedPreference('notifications.enabled', !preferences.notifications.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.notifications.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.notifications.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Sound Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Sound Notifications</p>
              <p className="text-sm text-gray-600">Play sound when notifications appear</p>
            </div>
            <button
              onClick={() => updateNestedPreference('notifications.sound', !preferences.notifications.sound)}
              disabled={!preferences.notifications.enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.notifications.sound ? 'bg-blue-600' : 'bg-gray-200'
              } ${!preferences.notifications.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.notifications.sound ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Desktop Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Desktop Notifications</p>
              <p className="text-sm text-gray-600">Show browser notifications (requires permission)</p>
            </div>
            <button
              onClick={() => updateNestedPreference('notifications.desktop', !preferences.notifications.desktop)}
              disabled={!preferences.notifications.enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.notifications.desktop ? 'bg-blue-600' : 'bg-gray-200'
              } ${!preferences.notifications.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.notifications.desktop ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <SettingsIcon className="h-6 w-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
        </div>

        <div className="space-y-4">
          {/* Show Quick Stats */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Show Quick Stats</p>
              <p className="text-sm text-gray-600">Display quick statistics on dashboard</p>
            </div>
            <button
              onClick={() => updateNestedPreference('dashboard.showQuickStats', !preferences.dashboard.showQuickStats)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.dashboard.showQuickStats ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.dashboard.showQuickStats ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Show Recent Tasks */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Show Recent Tasks</p>
              <p className="text-sm text-gray-600">Display recent tasks on dashboard</p>
            </div>
            <button
              onClick={() => updateNestedPreference('dashboard.showRecentTasks', !preferences.dashboard.showRecentTasks)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.dashboard.showRecentTasks ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.dashboard.showRecentTasks ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Show Alerts */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Show Alerts</p>
              <p className="text-sm text-gray-600">Display system alerts on dashboard</p>
            </div>
            <button
              onClick={() => updateNestedPreference('dashboard.showAlerts', !preferences.dashboard.showAlerts)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.dashboard.showAlerts ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.dashboard.showAlerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Current Preferences Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">About Preferences</h3>
        <p className="text-sm text-blue-800">
          Your preferences are automatically saved to your browser's local storage. They will persist across sessions
          and will be available even after you log out and log back in.
        </p>
      </div>
    </div>
  );
};

export default Settings;
