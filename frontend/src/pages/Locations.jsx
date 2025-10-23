import { useState, useEffect } from 'react';
import locationsService from '../services/locationsService';
import { MapPin, TrendingUp, Building, Plus, X, Edit2, Trash2, Eye } from 'lucide-react';

const Locations = () => {
  const [locations, setLocations] = useState([]);
  const [hierarchy, setHierarchy] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [showHierarchyView, setShowHierarchyView] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    managerId: '',
    parentLocationId: '',
    isActive: true,
  });

  useEffect(() => {
    fetchLocations();
    fetchHierarchy();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await locationsService.getLocations();
      setLocations(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch locations');
      console.error('Error fetching locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHierarchy = async () => {
    try {
      const data = await locationsService.getHierarchy();
      setHierarchy(data);
    } catch (err) {
      console.error('Error fetching hierarchy:', err);
    }
  };

  const fetchScorecard = async (locationId) => {
    try {
      const data = await locationsService.getScorecard(locationId);
      setScorecard(data);
      setShowScorecardModal(true);
    } catch (err) {
      setError(err.message || 'Failed to fetch scorecard');
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    try {
      await locationsService.createLocation(formData);
      setShowCreateModal(false);
      resetForm();
      fetchLocations();
      fetchHierarchy();
    } catch (err) {
      setError(err.message || 'Failed to create location');
    }
  };

  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    try {
      await locationsService.updateLocation(selectedLocation.id, formData);
      setShowEditModal(false);
      resetForm();
      fetchLocations();
      fetchHierarchy();
    } catch (err) {
      setError(err.message || 'Failed to update location');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      try {
        await locationsService.deleteLocation(id);
        fetchLocations();
        fetchHierarchy();
      } catch (err) {
        setError(err.message || 'Failed to delete location');
      }
    }
  };

  const handleToggleActive = async (location) => {
    try {
      await locationsService.updateLocation(location.id, {
        ...location,
        isActive: !location.isActive,
      });
      fetchLocations();
    } catch (err) {
      setError(err.message || 'Failed to update location status');
    }
  };

  const openEditModal = (location) => {
    setSelectedLocation(location);
    setFormData({
      name: location.name || '',
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      zipCode: location.zipCode || '',
      phone: location.phone || '',
      managerId: location.managerId || '',
      parentLocationId: location.parentLocationId || '',
      isActive: location.isActive !== undefined ? location.isActive : true,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      managerId: '',
      parentLocationId: '',
      isActive: true,
    });
    setSelectedLocation(null);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 90) return 'bg-green-50';
    if (score >= 75) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const renderHierarchyNode = (node, level = 0) => {
    if (!node) return null;

    return (
      <div key={node.id} className={`ml-${level * 4}`}>
        <div className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded px-2">
          <Building className="w-4 h-4 text-blue-600" />
          <span className="font-medium">{node.name}</span>
          {node.isActive === false && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Inactive</span>
          )}
        </div>
        {node.children && node.children.length > 0 && (
          <div className="ml-6 border-l-2 border-gray-200 pl-2">
            {node.children.map((child) => renderHierarchyNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-8 h-8" />
              Location Management
            </h1>
            <p className="text-gray-600 mt-1">Manage locations, hierarchies, and performance</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHierarchyView(!showHierarchyView)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
            >
              <Building className="w-4 h-4" />
              {showHierarchyView ? 'Hide' : 'Show'} Hierarchy
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Location
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === 'cards'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cards View
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Table View
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Hierarchy View */}
      {showHierarchyView && hierarchy && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building className="w-6 h-6" />
            Location Hierarchy
          </h2>
          <div className="overflow-auto">
            {Array.isArray(hierarchy) ? (
              hierarchy.map((node) => renderHierarchyNode(node))
            ) : (
              renderHierarchyNode(hierarchy)
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading locations...</p>
        </div>
      ) : (
        <>
          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
                  No locations found
                </div>
              ) : (
                locations.map((location) => (
                  <div
                    key={location.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-6 h-6 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                        </div>
                        <button
                          onClick={() => handleToggleActive(location)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                            location.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {location.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        {location.address && (
                          <div>{location.address}</div>
                        )}
                        {(location.city || location.state || location.zipCode) && (
                          <div>
                            {location.city}, {location.state} {location.zipCode}
                          </div>
                        )}
                        {location.phone && (
                          <div>Phone: {location.phone}</div>
                        )}
                        {location.managerId && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Building className="w-4 h-4" />
                            Manager ID: {location.managerId}
                          </div>
                        )}
                      </div>

                      {/* Scorecard Preview */}
                      {location.scorecard && (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className={`p-2 rounded ${getScoreBgColor(location.scorecard.compliance)}`}>
                            <div className="text-xs text-gray-600">Compliance</div>
                            <div className={`text-lg font-bold ${getScoreColor(location.scorecard.compliance)}`}>
                              {location.scorecard.compliance}%
                            </div>
                          </div>
                          <div className={`p-2 rounded ${getScoreBgColor(location.scorecard.foodSafety)}`}>
                            <div className="text-xs text-gray-600">Food Safety</div>
                            <div className={`text-lg font-bold ${getScoreColor(location.scorecard.foodSafety)}`}>
                              {location.scorecard.foodSafety}%
                            </div>
                          </div>
                          <div className={`p-2 rounded ${getScoreBgColor(location.scorecard.operations)}`}>
                            <div className="text-xs text-gray-600">Operations</div>
                            <div className={`text-lg font-bold ${getScoreColor(location.scorecard.operations)}`}>
                              {location.scorecard.operations}%
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchScorecard(location.id)}
                          className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm flex items-center justify-center gap-1"
                        >
                          <TrendingUp className="w-4 h-4" />
                          Scorecard
                        </button>
                        <button
                          onClick={() => openEditModal(location)}
                          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(location.id)}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Manager
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
                    {locations.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                          No locations found
                        </td>
                      </tr>
                    ) : (
                      locations.map((location) => (
                        <tr key={location.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{location.name}</div>
                                {location.phone && (
                                  <div className="text-sm text-gray-500">{location.phone}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {location.address && <div>{location.address}</div>}
                              {(location.city || location.state) && (
                                <div className="text-gray-500">
                                  {location.city}, {location.state} {location.zipCode}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {location.managerId ? (
                              <div className="flex items-center gap-1">
                                <Building className="w-4 h-4 text-gray-400" />
                                ID: {location.managerId}
                              </div>
                            ) : (
                              <span className="text-gray-400">Not assigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleActive(location)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                location.isActive
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {location.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => fetchScorecard(location.id)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded transition"
                                title="View Scorecard"
                              >
                                <TrendingUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(location)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLocation(location.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Location Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create New Location</h2>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateLocation}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager ID
                  </label>
                  <input
                    type="text"
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Location ID
                  </label>
                  <input
                    type="text"
                    value={formData.parentLocationId}
                    onChange={(e) => setFormData({ ...formData, parentLocationId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active Location</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Location</h2>
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateLocation}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager ID
                  </label>
                  <input
                    type="text"
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Location ID
                  </label>
                  <input
                    type="text"
                    value={formData.parentLocationId}
                    onChange={(e) => setFormData({ ...formData, parentLocationId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active Location</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Update Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scorecard Modal */}
      {showScorecardModal && scorecard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                Location Scorecard
              </h2>
              <button
                onClick={() => setShowScorecardModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className={`p-6 rounded-lg ${getScoreBgColor(scorecard.compliance || 0)}`}>
                <div className="text-sm font-medium text-gray-600 mb-2">Compliance Score</div>
                <div className={`text-4xl font-bold ${getScoreColor(scorecard.compliance || 0)}`}>
                  {scorecard.compliance || 0}%
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Based on regulatory compliance checks
                </div>
              </div>

              <div className={`p-6 rounded-lg ${getScoreBgColor(scorecard.foodSafety || 0)}`}>
                <div className="text-sm font-medium text-gray-600 mb-2">Food Safety Score</div>
                <div className={`text-4xl font-bold ${getScoreColor(scorecard.foodSafety || 0)}`}>
                  {scorecard.foodSafety || 0}%
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Temperature logs and safety protocols
                </div>
              </div>

              <div className={`p-6 rounded-lg ${getScoreBgColor(scorecard.operations || 0)}`}>
                <div className="text-sm font-medium text-gray-600 mb-2">Operations Score</div>
                <div className={`text-4xl font-bold ${getScoreColor(scorecard.operations || 0)}`}>
                  {scorecard.operations || 0}%
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Task completion and efficiency
                </div>
              </div>
            </div>

            {scorecard.details && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Additional Details</h3>
                <pre className="text-sm text-gray-700 overflow-auto max-h-64">
                  {JSON.stringify(scorecard.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Locations;
