import api from '../utils/api';

export const invoicesService = {
  // Get all invoices with optional filters
  async getInvoices(filters = {}) {
    const response = await api.get('/invoices', { params: filters });
    return response.data;
  },

  // Get invoice by ID
  async getInvoiceById(id) {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  // Create new invoice
  async createInvoice(invoiceData) {
    const response = await api.post('/invoices', invoiceData);
    return response.data;
  },

  // Update invoice
  async updateInvoice(id, invoiceData) {
    const response = await api.put(`/invoices/${id}`, invoiceData);
    return response.data;
  },

  // Approve invoice
  async approveInvoice(id, approvalData) {
    const response = await api.patch(`/invoices/${id}/approve`, approvalData);
    return response.data;
  },

  // Reconcile invoice
  async reconcileInvoice(id, reconciliationData) {
    const response = await api.patch(`/invoices/${id}/reconcile`, reconciliationData);
    return response.data;
  },
};

export default invoicesService;
