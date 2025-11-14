import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Text, Card, FAB, Chip, Searchbar, ActivityIndicator } from 'react-native-paper';
import tasksService from '../../services/tasksService';

export default function TasksScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await tasksService.getTasks(params);
      setTasks(response.data || []);
    } catch (error) {
      console.error('Tasks load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FCD34D',
      in_progress: '#60A5FA',
      completed: '#34D399',
      failed: '#F87171',
      overdue: '#EF4444',
    };
    return colors[status] || '#9CA3AF';
  };

  const renderTask = ({ item }) => (
    <Card
      style={styles.taskCard}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
    >
      <Card.Content>
        <View style={styles.taskHeader}>
          <Text variant="titleMedium" style={styles.taskTitle}>
            {item.title}
          </Text>
          <Chip
            mode="flat"
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={{ color: '#fff' }}
          >
            {item.status}
          </Chip>
        </View>

        {item.description && (
          <Text variant="bodyMedium" numberOfLines={2} style={styles.taskDesc}>
            {item.description}
          </Text>
        )}

        <View style={styles.taskMeta}>
          <Chip mode="outlined" compact>
            {item.type}
          </Chip>
          <Chip mode="outlined" compact>
            {item.priority}
          </Chip>
          {item.due_date && (
            <Text variant="bodySmall" style={styles.dueDate}>
              Due: {new Date(item.due_date).toLocaleDateString()}
            </Text>
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
        <Text variant="headlineMedium" style={styles.title}>
          Tasks
        </Text>
      </View>

      <Searchbar
        placeholder="Search tasks..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <View style={styles.filters}>
        {['all', 'pending', 'in_progress', 'completed'].map((status) => (
          <Chip
            key={status}
            mode={filter === status ? 'flat' : 'outlined'}
            selected={filter === status}
            onPress={() => setFilter(status)}
            style={styles.filterChip}
          >
            {status.replace('_', ' ')}
          </Chip>
        ))}
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge">No tasks found</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTask')}
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
  searchBar: {
    margin: 16,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    textTransform: 'capitalize',
  },
  list: {
    padding: 16,
  },
  taskCard: {
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    height: 24,
  },
  taskDesc: {
    marginBottom: 12,
    color: '#666',
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dueDate: {
    marginLeft: 'auto',
    color: '#666',
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
