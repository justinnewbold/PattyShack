import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import analyticsService from '../../services/analyticsService';
import tasksService from '../../services/tasksService';
import temperaturesService from '../../services/temperaturesService';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [tempAlerts, setTempAlerts] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashboard, tasks, alerts] = await Promise.all([
        analyticsService.getDashboard(),
        tasksService.getTasks({ limit: 5 }),
        temperaturesService.getAlerts({ status: 'active' }),
      ]);

      setDashboardData(dashboard.data);
      setRecentTasks(tasks.data || []);
      setTempAlerts(alerts.data || []);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Welcome back, {user?.firstName || user?.username}!
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="headlineLarge" style={styles.statNumber}>
              {dashboardData?.tasksPending || 0}
            </Text>
            <Text variant="bodySmall">Pending Tasks</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="headlineLarge" style={styles.statNumber}>
              {tempAlerts.length}
            </Text>
            <Text variant="bodySmall">Active Alerts</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Quick Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Quick Actions
          </Text>
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              icon="clipboard-plus"
              onPress={() => navigation.navigate('Tasks')}
              style={styles.actionButton}
            >
              New Task
            </Button>
            <Button
              mode="contained"
              icon="thermometer"
              onPress={() => navigation.navigate('LogTemperature')}
              style={styles.actionButton}
            >
              Log Temp
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Temperature Alerts */}
      {tempAlerts.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Temperature Alerts
            </Text>
            {tempAlerts.map((alert) => (
              <Card key={alert.id} style={styles.alertItem}>
                <Card.Content>
                  <Text variant="bodyMedium" style={styles.alertText}>
                    {alert.equipment_type} - {alert.temperature}°F
                  </Text>
                  <Chip mode="flat" style={styles.alertChip}>
                    {alert.severity}
                  </Chip>
                </Card.Content>
              </Card>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Recent Tasks */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Recent Tasks
          </Text>
          {recentTasks.map((task) => (
            <Card
              key={task.id}
              style={styles.taskItem}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            >
              <Card.Content>
                <Text variant="bodyLarge">{task.title}</Text>
                <View style={styles.taskMeta}>
                  <Chip mode="flat">{task.status}</Chip>
                  <Text variant="bodySmall">{task.priority}</Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FF6B35',
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#fff',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  card: {
    margin: 16,
    marginTop: 0,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  alertItem: {
    marginBottom: 8,
    backgroundColor: '#FEE',
  },
  alertText: {
    fontWeight: '500',
  },
  alertChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  taskItem: {
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
});
