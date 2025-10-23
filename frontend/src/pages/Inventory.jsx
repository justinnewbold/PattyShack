import { useState, useEffect } from 'react';
import inventoryService from '../services/inventoryService';
import { Package, AlertCircle, TrendingDown, Plus, Filter, X, BarChart3 } from 'lucide-react';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [variance, setVariance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [showCountModal, setShowCountModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [showVarianceModal, setShowVarianceModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form data
  const [countForm, setCountForm] = useState({
    item_id: '',
    quantity: '',
    notes: ''
  });

  const [wasteForm, setWasteForm] = useState({
    item_id: '',
    quantity: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    fetchItems();
  }, [categoryFilter, lowStockOnly]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (categoryFilter) filters.category = categoryFilter;
      if (lowStockOnly) filters.low_stock = true;

      const data = await inventoryService.getItems(filters);
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  const fetchVariance = async () => {
    try {
      const data = await inventoryService.getVariance();
      setVariance(data);
      setShowVarianceModal(true);
    } catch (err) {
      alert('Failed to fetch variance report: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCountSubmit = async (e) => {
    e.preventDefault();
    try {
      await inventoryService.recordCount({
        ...countForm,
        quantity: parseFloat(countForm.quantity)
      });
      setShowCountModal(false);
      setCountForm({ item_id: '', quantity: '', notes: '' });
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      alert('Failed to record count: ' + (err.message || 'Unknown error'));
    }
  };

  const handleWasteSubmit = async (e) => {
    e.preventDefault();
    try {
      await inventoryService.logWaste({
        ...wasteForm,
        quantity: parseFloat(wasteForm.quantity)
      });
      setShowWasteModal(false);
      setWasteForm({ item_id: '', quantity: '', reason: '', notes: '' });
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      alert('Failed to log waste: ' + (err.message || 'Unknown error'));
    }
  };

  const openCountModal = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setCountForm({ ...countForm, item_id: item.id });
    }
    setShowCountModal(true);
  };

  const openWasteModal = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setWasteForm({ ...wasteForm, item_id: item.id });
    }
    setShowWasteModal(true);
  };

  const isLowStock = (item) => {
    return item.current_quantity <= item.par_level;
  };

  const getStockStatusColor = (item) => {
    if (item.current_quantity === 0) return 'text-red-600 bg-red-50';
    if (isLowStock(item)) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStockStatusText = (item) => {
    if (item.current_quantity === 0) return 'Out of Stock';
    if (isLowStock(item)) return 'Low Stock';
    return 'In Stock';
  };

  const categories = [...new Set(items.map(item => item.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 font-semibold">Error: {error}</p>
          <button
            onClick={fetchItems}
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
            <Package className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openCountModal()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Record Count
            </button>
            <button
              onClick={() => openWasteModal()}
              className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <TrendingDown className="w-5 h-5 mr-2" />
              Log Waste
            </button>
            <button
              onClick={fetchVariance}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Variance Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center mb-3">
            <Filter className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Low Stock Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Inventory Items */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Inventory Items</h2>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No inventory items found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Current Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Par Level
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 transition-colors ${isLowStock(item) ? 'bg-yellow-50' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.category || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`font-bold ${item.current_quantity === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.current_quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.par_level}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.unit || 'units'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(item)}`}>
                            {getStockStatusText(item)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openCountModal(item)}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                            >
                              Count
                            </button>
                            <button
                              onClick={() => openWasteModal(item)}
                              className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
                            >
                              Waste
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 ${isLowStock(item) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                        {item.category && (
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(item)}`}>
                        {getStockStatusText(item)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-600">Current Quantity</p>
                        <p className={`text-lg font-bold ${item.current_quantity === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.current_quantity} {item.unit || 'units'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Par Level</p>
                        <p className="text-lg font-bold text-gray-900">
                          {item.par_level} {item.unit || 'units'}
                        </p>
                      </div>
                    </div>

                    {isLowStock(item) && (
                      <div className="flex items-center text-yellow-700 text-sm mb-3">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        <span>Below par level - reorder needed</span>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => openCountModal(item)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Record Count
                      </button>
                      <button
                        onClick={() => openWasteModal(item)}
                        className="flex-1 px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                      >
                        Log Waste
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Record Count Modal */}
      {showCountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Record Inventory Count</h3>
              <button
                onClick={() => {
                  setShowCountModal(false);
                  setSelectedItem(null);
                  setCountForm({ item_id: '', quantity: '', notes: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCountSubmit} className="p-6 space-y-4">
              {selectedItem && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{selectedItem.name}</p>
                  <p className="text-xs text-gray-600">
                    Current: {selectedItem.current_quantity} {selectedItem.unit || 'units'}
                  </p>
                </div>
              )}

              {!selectedItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item
                  </label>
                  <select
                    value={countForm.item_id}
                    onChange={(e) => setCountForm({ ...countForm, item_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Counted Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={countForm.quantity}
                  onChange={(e) => setCountForm({ ...countForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={countForm.notes}
                  onChange={(e) => setCountForm({ ...countForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCountModal(false);
                    setSelectedItem(null);
                    setCountForm({ item_id: '', quantity: '', notes: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Record Count
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Waste Modal */}
      {showWasteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Log Waste</h3>
              <button
                onClick={() => {
                  setShowWasteModal(false);
                  setSelectedItem(null);
                  setWasteForm({ item_id: '', quantity: '', reason: '', notes: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleWasteSubmit} className="p-6 space-y-4">
              {selectedItem && (
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{selectedItem.name}</p>
                  <p className="text-xs text-gray-600">
                    Current: {selectedItem.current_quantity} {selectedItem.unit || 'units'}
                  </p>
                </div>
              )}

              {!selectedItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item
                  </label>
                  <select
                    value={wasteForm.item_id}
                    onChange={(e) => setWasteForm({ ...wasteForm, item_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waste Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={wasteForm.quantity}
                  onChange={(e) => setWasteForm({ ...wasteForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={wasteForm.reason}
                  onChange={(e) => setWasteForm({ ...wasteForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Reason</option>
                  <option value="spoilage">Spoilage</option>
                  <option value="expiration">Expiration</option>
                  <option value="damage">Damage</option>
                  <option value="preparation_error">Preparation Error</option>
                  <option value="contamination">Contamination</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={wasteForm.notes}
                  onChange={(e) => setWasteForm({ ...wasteForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Additional details about the waste"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowWasteModal(false);
                    setSelectedItem(null);
                    setWasteForm({ item_id: '', quantity: '', reason: '', notes: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Log Waste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variance Report Modal */}
      {showVarianceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Variance Report</h3>
              <button
                onClick={() => {
                  setShowVarianceModal(false);
                  setVariance([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {variance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No variance data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Expected
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actual
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Variance
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Variance %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {variance.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {item.item_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.expected_quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.actual_quantity}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={item.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {item.variance > 0 ? '+' : ''}{item.variance}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={item.variance_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {item.variance_percentage > 0 ? '+' : ''}{item.variance_percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
