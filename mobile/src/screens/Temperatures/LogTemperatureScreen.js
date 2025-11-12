import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, HelperText } from 'react-native-paper';
import temperaturesService from '../../services/temperaturesService';
import * as Camera from 'expo-camera';

export default function LogTemperatureScreen({ navigation }) {
  const [formData, setFormData] = useState({
    equipment_id: '',
    equipment_type: 'refrigerator',
    temperature: '',
    unit: 'F',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!formData.equipment_id || !formData.temperature) {
      setError('Please fill in required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await temperaturesService.logTemperature({
        ...formData,
        temperature: parseFloat(formData.temperature),
      });
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'Failed to log temperature');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Button icon="arrow-left" mode="text" onPress={() => navigation.goBack()}>
            Back
          </Button>
          <Text variant="headlineSmall" style={styles.title}>
            Log Temperature
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Equipment ID *"
            value={formData.equipment_id}
            onChangeText={(text) => setFormData({ ...formData, equipment_id: text })}
            mode="outlined"
            style={styles.input}
          />

          <Text variant="bodyMedium" style={styles.label}>
            Equipment Type *
          </Text>
          <SegmentedButtons
            value={formData.equipment_type}
            onValueChange={(value) => setFormData({ ...formData, equipment_type: value })}
            buttons={[
              { value: 'refrigerator', label: 'Fridge' },
              { value: 'freezer', label: 'Freezer' },
              { value: 'hot_holding', label: 'Hot' },
            ]}
            style={styles.segmented}
          />

          <TextInput
            label="Temperature *"
            value={formData.temperature}
            onChangeText={(text) => setFormData({ ...formData, temperature: text })}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />

          <Text variant="bodyMedium" style={styles.label}>
            Unit
          </Text>
          <SegmentedButtons
            value={formData.unit}
            onValueChange={(value) => setFormData({ ...formData, unit: value })}
            buttons={[
              { value: 'F', label: 'Fahrenheit' },
              { value: 'C', label: 'Celsius' },
            ]}
            style={styles.segmented}
          />

          <TextInput
            label="Notes"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
          />

          {error ? (
            <HelperText type="error" visible={true}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Log Temperature
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
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
  form: {
    padding: 20,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontWeight: '500',
  },
  segmented: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
  },
});
