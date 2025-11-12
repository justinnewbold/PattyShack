import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { BarCodeScanner } from 'expo-barcode-scanner';
import inventoryService from '../../services/inventoryService';

export default function InventoryCountScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [itemInfo, setItemInfo] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);

    try {
      const response = await inventoryService.scanBarcode(data);
      setItemInfo(response.data);
    } catch (error) {
      Alert.alert('Error', 'Item not found in inventory');
      setScanned(false);
    }
  };

  const handleSubmitCount = async () => {
    if (!quantity || !itemInfo) {
      Alert.alert('Error', 'Please enter a quantity');
      return;
    }

    setLoading(true);

    try {
      await inventoryService.performCount({
        item_id: itemInfo.id,
        quantity: parseFloat(quantity),
      });

      Alert.alert('Success', 'Inventory count recorded', [
        {
          text: 'OK',
          onPress: () => {
            setScanned(false);
            setItemInfo(null);
            setQuantity('');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to record count');
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
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
          Scan Barcode
        </Text>
      </View>

      {!scanned ? (
        <View style={styles.scannerContainer}>
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.scanOverlay}>
            <Text variant="titleMedium" style={styles.scanText}>
              Scan item barcode
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.countContainer}>
          {itemInfo && (
            <>
              <Text variant="headlineSmall" style={styles.itemName}>
                {itemInfo.name}
              </Text>
              <Text variant="bodyMedium" style={styles.itemDetails}>
                SKU: {itemInfo.sku} | Category: {itemInfo.category}
              </Text>
              <Text variant="bodyMedium" style={styles.itemDetails}>
                Current: {itemInfo.current_quantity} {itemInfo.unit}
              </Text>

              <TextInput
                label="Counted Quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />

              <Button
                mode="contained"
                onPress={handleSubmitCount}
                loading={loading}
                disabled={loading}
                style={styles.button}
              >
                Submit Count
              </Button>

              <Button
                mode="outlined"
                onPress={() => {
                  setScanned(false);
                  setItemInfo(null);
                  setQuantity('');
                }}
                style={styles.button}
              >
                Scan Another
              </Button>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanText: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 8,
  },
  countContainer: {
    flex: 1,
    padding: 20,
  },
  itemName: {
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  itemDetails: {
    color: '#666',
    marginBottom: 4,
  },
  input: {
    marginTop: 24,
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
});
