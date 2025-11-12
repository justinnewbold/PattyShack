import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip } from 'react-native-paper';
import schedulesService from '../../services/schedulesService';
import { useAuth } from '../../context/AuthContext';

export default function SchedulesScreen({ navigation }) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clockingIn, setClockingIn] = useState(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await schedulesService.getSchedules({
        userId: user.id,
        date: new Date().toISOString().split('T')[0],
      });
      setSchedules(response.data || []);
    } catch (error) {
      console.error('Schedules load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedules();
  };

  const handleClockIn = async (scheduleId) => {
    setClockingIn(scheduleId);
    try {
      await schedulesService.clockIn(scheduleId, {
        latitude: null, // TODO: Add geolocation
        longitude: null,
      });
      loadSchedules();
    } catch (error) {
      console.error('Clock in error:', error);
    } finally {
      setClockingIn(null);
    }
  };

  const handleClockOut = async (scheduleId) => {
    setClockingIn(scheduleId);
    try {
      await schedulesService.clockOut(scheduleId);
      loadSchedules();
    } catch (error) {
      console.error('Clock out error:', error);
    } finally {
      setClockingIn(null);
    }
  };

  const renderSchedule = ({ item }) => (
    <Card style={styles.scheduleCard}>
      <Card.Content>
        <View style={styles.scheduleHeader}>
          <Text variant="titleMedium">{item.position || 'Shift'}</Text>
          <Chip mode="flat">{item.status}</Chip>
        </View>

        <View style={styles.scheduleMeta}>
          <Text variant="bodyMedium">
            {new Date(item.date).toLocaleDateString()}
          </Text>
          <Text variant="bodyMedium">
            {item.start_time} - {item.end_time}
          </Text>
          <Text variant="bodySmall">
            Scheduled: {item.scheduled_hours}h
          </Text>
        </View>

        {item.clock_in_time && (
          <Text variant="bodySmall" style={styles.clockInfo}>
            Clocked In: {new Date(item.clock_in_time).toLocaleTimeString()}
          </Text>
        )}

        {item.clock_out_time && (
          <Text variant="bodySmall" style={styles.clockInfo}>
            Clocked Out: {new Date(item.clock_out_time).toLocaleTimeString()}
          </Text>
        )}

        <View style={styles.actions}>
          {!item.clock_in_time && item.status === 'scheduled' && (
            <Button
              mode="contained"
              onPress={() => handleClockIn(item.id)}
              loading={clockingIn === item.id}
              disabled={clockingIn !== null}
            >
              Clock In
            </Button>
          )}

          {item.clock_in_time && !item.clock_out_time && (
            <Button
              mode="contained"
              onPress={() => handleClockOut(item.id)}
              loading={clockingIn === item.id}
              disabled={clockingIn !== null}
            >
              Clock Out
            </Button>
          )}
        </View>
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
        <Button icon="arrow-left" mode="text" onPress={() => navigation.goBack()}>
          Back
        </Button>
        <Text variant="headlineSmall" style={styles.title}>
          My Schedule
        </Text>
      </View>

      <FlatList
        data={schedules}
        renderItem={renderSchedule}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge">No scheduled shifts</Text>
          </View>
        }
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
    marginTop: 8,
  },
  list: {
    padding: 16,
  },
  scheduleCard: {
    marginBottom: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleMeta: {
    gap: 4,
    marginBottom: 12,
  },
  clockInfo: {
    color: '#666',
    marginTop: 4,
  },
  actions: {
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
});
