import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, FAB, Chip, ActivityIndicator } from 'react-native-paper';
import temperaturesService from '../../services/temperaturesService';

export default function TemperaturesScreen({ navigation }) {
  const [temps, setTemps] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tempResponse, alertResponse] = await Promise.all([
        temperaturesService.getTemperatureLogs({ limit: 20 }),
        temperaturesService.getAlerts({ status: 'active' }),
      ]);
      setTemps(tempResponse.data || []);
      setAlerts(alertResponse.data || []);
    } catch (error) {
      console.error('Temperature load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderTemp = ({ item }) => (
    <Card style={styles.tempCard}>
      <Card.Content>
        <View style={styles.tempHeader}>
          <Text variant="titleMedium">{item.equipment_type}</Text>
          <Text
            variant="headlineSmall"
            style={[
              styles.temperature,
              { color: item.is_in_range ? '#10B981' : '#EF4444' },
            ]}
          >
            {item.temperature}°{item.unit}
          </Text>
        </View>
        <View style={styles.tempMeta}>
          <Text variant="bodySmall">Equipment ID: {item.equipment_id}</Text>
          <Text variant="bodySmall">
            {new Date(item.recorded_at).toLocaleString()}
          </Text>
        </View>
        {!item.is_in_range && (
          <Chip mode="flat" style={styles.alertChip}>
            Out of Range
          </Chip>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Temperature Monitoring
        </Text>
      </View>

      {alerts.length > 0 && (
        <Card style={styles.alertsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.alertsTitle}>
              Active Alerts ({alerts.length})
            </Text>
            {alerts.slice(0, 3).map((alert) => (
              <Chip key={alert.id} mode="flat" style={styles.alertItem}>
                {alert.equipment_type} - {alert.temperature}°F
              </Chip>
            ))}
          </Card.Content>
        </Card>
      )}

      <FlatList
        data={temps}
        renderItem={renderTemp}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge">No temperature logs</Text>
          </View>
        }
      />

      <FAB
        icon="thermometer-plus"
        style={styles.fab}
        onPress={() => navigation.navigate('LogTemperature')}
      />
    </View>
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
  alertsCard: {
    margin: 16,
    backgroundColor: '#FEE',
  },
  alertsTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  alertItem: {
    marginBottom: 8,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  tempCard: {
    marginBottom: 12,
  },
  tempHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  temperature: {
    fontWeight: 'bold',
  },
  tempMeta: {
    gap: 4,
  },
  alertChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FEE',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6B35',
  },
});
