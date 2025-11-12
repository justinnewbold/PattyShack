import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, FAB, Searchbar, ActivityIndicator, Button, Chip } from 'react-native-paper';
import inventoryService from '../../services/inventoryService';

export default function InventoryScreen({ navigation }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const response = await inventoryService.getInventory();
      setInventory(response.data || []);
    } catch (error) {
      console.error('Inventory load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInventory();
  };

  const needsReorder = (item) => {
    return item.current_quantity <= item.reorder_point;
  };

  const renderItem = ({ item }) => (
    <Card style={styles.itemCard}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium">{item.name}</Text>
            {item.sku && <Text variant="bodySmall">SKU: {item.sku}</Text>}
          </View>
          {needsReorder(item) && (
            <Chip mode="flat" style={styles.reorderChip}>
              Reorder
            </Chip>
          )}
        </View>

        <View style={styles.itemMeta}>
          <View>
            <Text variant="bodySmall">Current</Text>
            <Text variant="titleMedium">
              {item.current_quantity} {item.unit}
            </Text>
          </View>
          <View>
            <Text variant="bodySmall">Par Level</Text>
            <Text variant="titleMedium">
              {item.par_level} {item.unit}
            </Text>
          </View>
          <View>
            <Text variant="bodySmall">Value</Text>
            <Text variant="titleMedium">${item.total_value?.toFixed(2) || '0.00'}</Text>
          </View>
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
          Inventory
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search inventory..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <Button
          mode="outlined"
          icon="barcode-scan"
          onPress={() => navigation.navigate('InventoryCount')}
          style={styles.scanButton}
        >
          Scan
        </Button>
      </View>

      <FlatList
        data={inventory.filter((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge">No inventory items</Text>
          </View>
        }
      />

      <FAB
        icon="counter"
        label="Count"
        style={styles.fab}
        onPress={() => navigation.navigate('InventoryCount')}
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchBar: {
    flex: 1,
  },
  scanButton: {
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reorderChip: {
    backgroundColor: '#FCD34D',
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
