import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Array of column definitions { key, label }
 */
export const exportToCSV = (data, filename, columns) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Create CSV header
  const headers = columns.map(col => col.label).join(',');

  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = getNestedValue(item, col.key);
      // Handle special characters and quotes in CSV
      const stringValue = String(value ?? '');
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  }).join('\n');

  // Combine headers and rows
  const csv = `${headers}\n${rows}`;

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${getTimestamp()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export data to PDF format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {string} title - Title for the PDF document
 * @param {Array} columns - Array of column definitions { key, label }
 */
export const exportToPDF = (data, filename, title, columns) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Create new PDF document
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Add metadata
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  doc.text(`Total Records: ${data.length}`, 14, 36);

  // Prepare table data
  const headers = columns.map(col => col.label);
  const rows = data.map(item => {
    return columns.map(col => {
      const value = getNestedValue(item, col.key);
      return String(value ?? '');
    });
  });

  // Add table
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 42,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246], // Blue color
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 'auto' }
    },
    margin: { top: 42 }
  });

  // Save the PDF
  doc.save(`${filename}_${getTimestamp()}.pdf`);
};

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to get value from
 * @param {string} path - Path to value (e.g., 'user.name')
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Get timestamp for filename
 */
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').split('T')[0];
};

/**
 * Export tasks data
 */
export const exportTasks = (tasks, format = 'csv') => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'assignedTo', label: 'Assigned To' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'createdAt', label: 'Created At' }
  ];

  if (format === 'pdf') {
    exportToPDF(tasks, 'tasks', 'Tasks Report', columns);
  } else {
    exportToCSV(tasks, 'tasks', columns);
  }
};

/**
 * Export inventory data
 */
export const exportInventory = (items, format = 'csv') => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'unit', label: 'Unit' },
    { key: 'minQuantity', label: 'Min Quantity' },
    { key: 'location', label: 'Location' },
    { key: 'supplier', label: 'Supplier' }
  ];

  if (format === 'pdf') {
    exportToPDF(items, 'inventory', 'Inventory Report', columns);
  } else {
    exportToCSV(items, 'inventory', columns);
  }
};

/**
 * Export temperature data
 */
export const exportTemperatures = (temperatures, format = 'csv') => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'equipmentName', label: 'Equipment' },
    { key: 'temperature', label: 'Temperature (°F)' },
    { key: 'location', label: 'Location' },
    { key: 'recordedBy', label: 'Recorded By' },
    { key: 'notes', label: 'Notes' },
    { key: 'recordedAt', label: 'Recorded At' }
  ];

  if (format === 'pdf') {
    exportToPDF(temperatures, 'temperatures', 'Temperature Log Report', columns);
  } else {
    exportToCSV(temperatures, 'temperatures', columns);
  }
};

/**
 * Generic export function
 */
export const exportData = (data, filename, title, columns, format = 'csv') => {
  if (format === 'pdf') {
    exportToPDF(data, filename, title, columns);
  } else {
    exportToCSV(data, filename, columns);
  }
};
