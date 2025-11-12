import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Offline Storage Utility
 * Manages offline data caching and sync queue
 */

const OFFLINE_QUEUE_KEY = '@offline_queue';
const CACHE_PREFIX = '@cache_';

class OfflineStorage {
  constructor() {
    this.isOnline = true;
    this.syncInProgress = false;

    // Monitor network status
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;

      // Trigger sync when coming back online
      if (wasOffline && this.isOnline) {
        this.syncQueue();
      }
    });
  }

  /**
   * Check if device is online
   */
  async checkConnection() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected;
    return this.isOnline;
  }

  /**
   * Add action to offline queue
   */
  async addToQueue(action) {
    try {
      const queue = await this.getQueue();
      queue.push({
        ...action,
        timestamp: new Date().toISOString(),
        id: `${Date.now()}_${Math.random()}`,
      });
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      return true;
    } catch (error) {
      console.error('Error adding to queue:', error);
      return false;
    }
  }

  /**
   * Get offline queue
   */
  async getQueue() {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Error getting queue:', error);
      return [];
    }
  }

  /**
   * Sync offline queue when online
   */
  async syncQueue() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      const queue = await this.getQueue();
      const failed = [];

      for (const action of queue) {
        try {
          // Execute the queued action
          await this.executeAction(action);
        } catch (error) {
          console.error('Sync action failed:', error);
          failed.push(action);
        }
      }

      // Save failed actions back to queue
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failed));
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute a queued action
   */
  async executeAction(action) {
    // TODO: Implement action execution based on type
    // This would dispatch to appropriate service methods
    console.log('Executing action:', action);
  }

  /**
   * Cache data locally
   */
  async cacheData(key, data, ttl = 3600000) {
    // TTL in milliseconds (default 1 hour)
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
      return true;
    } catch (error) {
      console.error('Error caching data:', error);
      return false;
    }
  }

  /**
   * Get cached data
   */
  async getCachedData(key) {
    try {
      const cacheJson = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cacheJson) return null;

      const cacheItem = JSON.parse(cacheJson);
      const now = Date.now();

      // Check if cache is still valid
      if (now - cacheItem.timestamp > cacheItem.ttl) {
        await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Clear all cache
   */
  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Clear offline queue
   */
  async clearQueue() {
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing queue:', error);
      return false;
    }
  }
}

export default new OfflineStorage();
