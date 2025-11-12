import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const customColors = {
  primary: '#FF6B35',
  secondary: '#F7931E',
  tertiary: '#004E89',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

export default {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: customColors.primary,
    secondary: customColors.secondary,
    tertiary: customColors.tertiary,
    success: customColors.success,
    warning: customColors.warning,
    error: customColors.error,
    info: customColors.info,
  },
};
