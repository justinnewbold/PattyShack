import { useState, useEffect } from 'react';
import { Filter, X, Save, Star, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const FilterPanel = ({ filters, onFilterChange, onReset, savedPresets = [], onSavePreset, onDeletePreset, onLoadPreset }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    // Count active filters
    const count = Object.values(filters).filter(value => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value !== '';
      return value !== null && value !== undefined;
    }).length;
    setActiveFilterCount(count);
  }, [filters]);

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    const preset = {
      name: presetName,
      filters: { ...filters },
      createdAt: new Date().toISOString()
    };

    onSavePreset(preset);
    setPresetName('');
    setShowSaveDialog(false);
    toast.success(`Filter preset "${presetName}" saved`);
  };

  const handleLoadPreset = (preset) => {
    onLoadPreset(preset.filters);
    toast.success(`Loaded preset "${preset.name}"`);
  };

  const handleDeletePreset = (presetId) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      onDeletePreset(presetId);
      toast.success('Preset deleted');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Filter Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Filter className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={onReset}
                className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear all
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Saved Presets */}
          {savedPresets && savedPresets.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Saved Presets</label>
              <div className="flex flex-wrap gap-2">
                {savedPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="group flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-md transition-all"
                  >
                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800"
                    >
                      <Star className="h-3.5 w-3.5 fill-blue-400" />
                      {preset.name}
                    </button>
                    <button
                      onClick={() => handleDeletePreset(preset.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500 hover:text-red-700" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Fields - These are passed as children or rendered based on config */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            {filters.hasOwnProperty('status') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => onFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}

            {/* Priority Filter */}
            {filters.hasOwnProperty('priority') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) => onFilterChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            )}

            {/* Date From */}
            {filters.hasOwnProperty('dateFrom') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Date To */}
            {filters.hasOwnProperty('dateTo') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => onFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Search Filter */}
            {filters.hasOwnProperty('search') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => onFilterChange('search', e.target.value)}
                  placeholder="Search..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Location Filter */}
            {filters.hasOwnProperty('location') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <select
                  value={filters.location || ''}
                  onChange={(e) => onFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  <option value="location-a">Location A</option>
                  <option value="location-b">Location B</option>
                  <option value="location-c">Location C</option>
                </select>
              </div>
            )}
          </div>

          {/* Save Preset Section */}
          <div className="pt-4 border-t border-gray-200">
            {showSaveDialog ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleSavePreset()}
                />
                <button
                  onClick={handleSavePreset}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setPresetName('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={activeFilterCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                Save Current Filters as Preset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
