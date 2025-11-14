import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Button, Text, Chip, ActivityIndicator } from 'react-native-paper';
import tasksService from '../../services/tasksService';

export default function CreateTaskScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'line_check',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
    locationId: '',
    assignedTo: '',
  });

  const taskTypes = [
    'line_check',
    'opening',
    'closing',
    'food_safety',
    'maintenance',
    'other',
  ];

  const priorities = ['low', 'medium', 'high', 'critical'];

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    try {
      setLoading(true);
      await tasksService.createTask(formData);
      navigation.goBack();
    } catch (error) {
      console.error('Create task error:', error);
      alert(error.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Create New Task
          </Text>
        </View>

        <TextInput
          label="Title *"
          value={formData.title}
          onChangeText={(text) => updateField('title', text)}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Description"
          value={formData.description}
          onChangeText={(text) => updateField('description', text)}
          style={styles.input}
          mode="outlined"
          multiline
          numberOfLines={4}
        />

        <Text variant="titleSmall" style={styles.sectionTitle}>
          Task Type
        </Text>
        <View style={styles.chipContainer}>
          {taskTypes.map((type) => (
            <Chip
              key={type}
              mode={formData.type === type ? 'flat' : 'outlined'}
              selected={formData.type === type}
              onPress={() => updateField('type', type)}
              style={styles.chip}
            >
              {type.replace('_', ' ')}
            </Chip>
          ))}
        </View>

        <Text variant="titleSmall" style={styles.sectionTitle}>
          Priority
        </Text>
        <View style={styles.chipContainer}>
          {priorities.map((priority) => (
            <Chip
              key={priority}
              mode={formData.priority === priority ? 'flat' : 'outlined'}
              selected={formData.priority === priority}
              onPress={() => updateField('priority', priority)}
              style={styles.chip}
            >
              {priority}
            </Chip>
          ))}
        </View>

        <TextInput
          label="Due Date (YYYY-MM-DD)"
          value={formData.dueDate}
          onChangeText={(text) => updateField('dueDate', text)}
          style={styles.input}
          mode="outlined"
          placeholder="2025-12-31"
        />

        <TextInput
          label="Location ID"
          value={formData.locationId}
          onChangeText={(text) => updateField('locationId', text)}
          style={styles.input}
          mode="outlined"
          keyboardType="numeric"
        />

        <TextInput
          label="Assigned To (User ID)"
          value={formData.assignedTo}
          onChangeText={(text) => updateField('assignedTo', text)}
          style={styles.input}
          mode="outlined"
          keyboardType="numeric"
        />

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            buttonColor="#FF6B35"
          >
            Create Task
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
  },
});
