import { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

const KeyboardShortcutsModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShowShortcuts = () => setIsOpen(true);
    window.addEventListener('show-shortcuts', handleShowShortcuts);

    return () => {
      window.removeEventListener('show-shortcuts', handleShowShortcuts);
    };
  }, []);

  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { keys: [modKey, 'D'], description: 'Go to Dashboard' },
    { keys: [modKey, 'T'], description: 'Go to Tasks' },
    { keys: [modKey, 'I'], description: 'Go to Inventory' },
    { keys: [modKey, 'A'], description: 'Go to Analytics' },
    { keys: [modKey, 'K'], description: 'Show keyboard shortcuts' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['Esc'], description: 'Close modals/dialogs' }
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Keyboard className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-700 font-medium">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex} className="flex items-center">
                      <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-semibold text-gray-800">
                        {key}
                      </kbd>
                      {keyIndex < shortcut.keys.length - 1 && (
                        <span className="mx-1 text-gray-400">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Keyboard shortcuts work when you're not typing in an input field.
              Press <kbd className="px-2 py-1 bg-white border border-blue-300 rounded text-xs">?</kbd> or{' '}
              <kbd className="px-2 py-1 bg-white border border-blue-300 rounded text-xs">{modKey} K</kbd>{' '}
              anytime to see this help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
