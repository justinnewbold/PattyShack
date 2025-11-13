import { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';

const ExportButton = ({ data, onExportCSV, onExportPDF, disabled = false }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (format) => {
    setShowMenu(false);

    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      if (format === 'csv') {
        await onExportCSV();
        toast.success('CSV exported successfully!');
      } else if (format === 'pdf') {
        await onExportPDF();
        toast.success('PDF exported successfully!');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${format.toUpperCase()}: ${error.message}`);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || !data || data.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <Download className="h-5 w-5" />
        <span className="font-medium">Export</span>
      </button>

      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* Export menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Export as CSV</p>
                <p className="text-xs text-gray-500">Spreadsheet format</p>
              </div>
            </button>

            <div className="border-t border-gray-100" />

            <button
              onClick={() => handleExport('pdf')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <FileText className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Export as PDF</p>
                <p className="text-xs text-gray-500">Printable document</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;
