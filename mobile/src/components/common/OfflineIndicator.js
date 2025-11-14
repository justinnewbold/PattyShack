/**
 * Offline Indicator Component
 * Displays network status and offline queue information
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import offlineManager from '../../services/offlineManager';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });

    updateQueueSize();

    const interval = setInterval(updateQueueSize, 5000);

    offlineManager.onSyncComplete(() => {
      updateQueueSize();
      setIsSyncing(false);
    });

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const updateQueueSize = async () => {
    const stats = await offlineManager.getOfflineStats();
    setQueueSize(stats.queueSize);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await offlineManager.syncOfflineQueue();
  };

  if (isOnline && queueSize === 0) {
    return null; // Don't show anything when online and nothing to sync
  }

  return (
    <View style={[styles.container, !isOnline && styles.offline]}>
      <View style={styles.content}>
        <Text style={styles.text}>
          {!isOnline ? '📵 Offline' : `✅ Online`}
          {queueSize > 0 && ` • ${queueSize} pending`}
        </Text>

        {isOnline && queueSize > 0 && (
          <TouchableOpacity
            onPress={handleSync}
            disabled={isSyncing}
            style={styles.syncButton}
          >
            <Text style={styles.syncText}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offline: {
    backgroundColor: '#FF9800',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
  },
  syncText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OfflineIndicator;
