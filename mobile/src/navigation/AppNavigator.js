import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

// Main Screens
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import TasksScreen from '../screens/Tasks/TasksScreen';
import TaskDetailScreen from '../screens/Tasks/TaskDetailScreen';
import CreateTaskScreen from '../screens/Tasks/CreateTaskScreen';
import TemperaturesScreen from '../screens/Temperatures/TemperaturesScreen';
import LogTemperatureScreen from '../screens/Temperatures/LogTemperatureScreen';
import InventoryScreen from '../screens/Inventory/InventoryScreen';
import InventoryCountScreen from '../screens/Inventory/InventoryCountScreen';
import SchedulesScreen from '../screens/Schedules/SchedulesScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'view-dashboard';
          } else if (route.name === 'Tasks') {
            iconName = 'clipboard-check';
          } else if (route.name === 'Temps') {
            iconName = 'thermometer';
          } else if (route.name === 'Inventory') {
            iconName = 'package-variant';
          } else if (route.name === 'Profile') {
            iconName = 'account';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Temps" component={TemperaturesScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
          <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
          <Stack.Screen name="LogTemperature" component={LogTemperatureScreen} />
          <Stack.Screen name="InventoryCount" component={InventoryCountScreen} />
          <Stack.Screen name="Schedules" component={SchedulesScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
