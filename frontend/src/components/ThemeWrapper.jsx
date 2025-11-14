import { useEffect } from 'react';
import { usePreferences } from '../context/UserPreferencesContext';

const ThemeWrapper = ({ children }) => {
  const { preferences } = usePreferences();

  useEffect(() => {
    const root = document.documentElement;

    if (preferences.theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [preferences.theme]);

  return <>{children}</>;
};

export default ThemeWrapper;
