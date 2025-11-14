/**
 * Offline Manager Service
 * Handles offline data sync, queue management, and conflict resolution
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const OFFLINE_QUEUE_KEY = '@PattyShack:offline_queue';
const OFFLINE_DATA_KEY = '@PattyShack:offline_data';
const LAST_SYNC_KEY = '@PattyShack:last_sync';

class OfflineManager {
  constructor() {
    this.isOnline = true;
    this.syncCallbacks = [];
    this.initializeNetworkListener();
  }

  initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;

      if (wasOffline && this.isOnline) {
        console.log('🌐 Network restored, syncing offline data...');
        this.syncOfflineQueue();
      }
    });
  }

  async addToQueue(action) {
    try {
      const queue = await this.getQueue();

      const queueItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        action: action.type,
        endpoint: action.endpoint,
        method: action.method,
        data: action.data,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending'
      };

      queue.push(queueItem);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

      console.log(`📥 Added to offline queue: ${action.type}`);
      return queueItem;

    } catch (error) {
      console.error('Failed to add to offline queue:', error);
      throw error;
    }
  }

  async getQueue() {
    try {
      const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return [];
    }
  }

  async clearQueue() {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
  }

  async removeFromQueue(itemId) {
    try {
      const queue = await this.getQueue();
      const filteredQueue = queue.filter(item => item.id !== itemId);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filteredQueue));
    } catch (error) {
      console.error('Failed to remove from queue:', error);
    }
  }

  async syncOfflineQueue() {
    if (!this.isOnline) {
      console.log('📵 Offline - skipping sync');
      return { success: false, reason: 'offline' };
    }

    const queue = await this.getQueue();

    if (queue.length === 0) {
      console.log('✅ No offline data to sync');
      return { success: true, synced: 0 };
    }

    console.log(`🔄 Syncing ${queue.length} offline items...`);

    let synced = 0;
    let failed = 0;
    const errors = [];

    for (const item of queue) {
      try {
        // Import API dynamically to avoid circular dependencies
        const api = require('../config/api').default;

        const response = await api({
          url: item.endpoint,
          method: item.method,
          data: item.data
        });

        await this.removeFromQueue(item.id);
        synced++;

        console.log(`✅ Synced: ${item.action}`);

      } catch (error) {
        console.error(`❌ Failed to sync: ${item.action}`, error);

        // Increment retry count
        item.retries++;

        if (item.retries >= 3) {
          item.status = 'failed';
          errors.push({ item, error: error.message });
          failed++;
        } else {
          item.status = 'retrying';
        }
      }
    }

    // Update queue with retry statuses
    const updatedQueue = queue.filter(item => item.status !== 'synced');
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));

    // Update last sync timestamp
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    // Notify callbacks
    this.syncCallbacks.forEach(callback => callback({ synced, failed, errors }));

    return { success: true, synced, failed, errors };
  }

  async cacheData(key, data) {
    try {
      const cacheData = await this.getCachedData();
      cacheData[key] = {
        data,
        timestamp: Date.now(),
        version: 1
      };
      await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  async getCachedData(key = null) {
    try {
      const cacheData = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
      const parsed = cacheData ? JSON.parse(cacheData) : {};

      if (key) {
        return parsed[key]?.data || null;
      }

      return parsed;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return key ? null : {};
    }
  }

  async clearCache() {
    await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify({}));
  }

  async getLastSyncTime() {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return timestamp ? parseInt(timestamp) : null;
    } catch (error) {
      return null;
    }
  }

  onSyncComplete(callback) {
    this.syncCallbacks.push(callback);
  }

  async getOfflineStats() {
    const queue = await this.getQueue();
    const lastSync = await this.getLastSyncTime();
    const cacheData = await this.getCachedData();

    return {
      queueSize: queue.length,
      pendingActions: queue.filter(i => i.status === 'pending').length,
      failedActions: queue.filter(i => i.status === 'failed').length,
      lastSyncTime: lastSync,
      cachedItems: Object.keys(cacheData).length,
      isOnline: this.isOnline
    };
  }
}

export default new OfflineManager();
