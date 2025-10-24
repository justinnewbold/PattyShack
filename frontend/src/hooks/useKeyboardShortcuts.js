import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only trigger if not in an input field
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Check for Cmd/Ctrl + key combinations
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            navigate('/dashboard');
            break;
          case 't':
            e.preventDefault();
            navigate('/tasks');
            break;
          case 'i':
            e.preventDefault();
            navigate('/inventory');
            break;
          case 'a':
            e.preventDefault();
            navigate('/analytics');
            break;
          case 'k':
            e.preventDefault();
            // Show keyboard shortcuts modal (we'll implement this)
            window.dispatchEvent(new CustomEvent('show-shortcuts'));
            break;
          default:
            break;
        }
      }

      // Simple key shortcuts (without modifier keys)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        switch (e.key) {
          case '?':
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('show-shortcuts'));
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [navigate]);
};
