import { createContext, useContext, useState, useEffect } from 'react';

const UserPreferencesContext = createContext();

const DEFAULT_PREFERENCES = {
  theme: 'light', // 'light' or 'dark'
  exportFormat: 'csv', // 'csv' or 'pdf'
  defaultView: 'grid', // 'grid' or 'list'
  dateFormat: 'MM/DD/YYYY', // Date format preference
  notifications: {
    enabled: true,
    sound: false,
    desktop: false
  },
  dashboard: {
    showQuickStats: true,
    showRecentTasks: true,
    showAlerts: true
  }
};

const STORAGE_KEY = 'pattyshack_user_preferences';

export const UserPreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(() => {
    // Load preferences from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  });

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }, [preferences]);

  // Update a single preference
  const updatePreference = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Update nested preference (e.g., 'notifications.sound')
  const updateNestedPreference = (path, value) => {
    setPreferences(prev => {
      const keys = path.split('.');
      const updated = { ...prev };
      let current = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current[key] = { ...current[key] };
        current = current[key];
      }

      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  // Update multiple preferences at once
  const updatePreferences = (updates) => {
    setPreferences(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Reset preferences to default
  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Toggle theme between light and dark
  const toggleTheme = () => {
    setPreferences(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light'
    }));
  };

  // Toggle export format between CSV and PDF
  const toggleExportFormat = () => {
    setPreferences(prev => ({
      ...prev,
      exportFormat: prev.exportFormat === 'csv' ? 'pdf' : 'csv'
    }));
  };

  const value = {
    preferences,
    updatePreference,
    updateNestedPreference,
    updatePreferences,
    resetPreferences,
    toggleTheme,
    toggleExportFormat
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

// Custom hook to use preferences
export const usePreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within UserPreferencesProvider');
  }
  return context;
};

export default UserPreferencesContext;
