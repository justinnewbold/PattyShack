import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Text, Button, Card, Chip, ActivityIndicator } from 'react-native-paper';
import tasksService from '../../services/tasksService';

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      const response = await tasksService.getTask(taskId);
      setTask(response.data);
    } catch (error) {
      console.error('Task load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await tasksService.completeTask(taskId, {
        notes: 'Completed via mobile app',
      });
      navigation.goBack();
    } catch (error) {
      console.error('Complete task error:', error);
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Task not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Button icon="arrow-left" mode="text" onPress={() => navigation.goBack()}>
          Back
        </Button>
        <Text variant="headlineSmall" style={styles.title}>
          {task.title}
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.metaRow}>
            <Chip mode="flat">{task.status}</Chip>
            <Chip mode="outlined">{task.priority}</Chip>
            <Chip mode="outlined">{task.type}</Chip>
          </View>

          {task.description && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Description
              </Text>
              <Text variant="bodyMedium">{task.description}</Text>
            </View>
          )}

          {task.due_date && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Due Date
              </Text>
              <Text variant="bodyMedium">
                {new Date(task.due_date).toLocaleString()}
              </Text>
            </View>
          )}

          {task.assigned_to && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Assigned To
              </Text>
              <Text variant="bodyMedium">{task.assigned_to}</Text>
            </View>
          )}

          {task.checklist_items && task.checklist_items.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Checklist Items
              </Text>
              {task.checklist_items.map((item, index) => (
                <Text key={index} variant="bodyMedium" style={styles.checklistItem}>
                  • {item.text || item}
                </Text>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      {task.status !== 'completed' && (
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleComplete}
            loading={completing}
            disabled={completing}
            style={styles.button}
          >
            Complete Task
          </Button>
        </View>
      )}
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
    marginTop: 8,
  },
  card: {
    margin: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  checklistItem: {
    marginLeft: 8,
    marginBottom: 4,
  },
  actions: {
    padding: 16,
  },
  button: {
    paddingVertical: 6,
  },
});
