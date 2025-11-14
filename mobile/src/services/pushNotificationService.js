/**
 * Push Notification Service
 * Handles push notifications, local notifications, and notification permissions
 */

import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

const NOTIFICATION_PREFS_KEY = '@PattyShack:notification_prefs';
const DEVICE_TOKEN_KEY = '@PattyShack:device_token';

class PushNotificationService {
  constructor() {
    this.configure();
  }

  configure() {
    PushNotification.configure({
      // Called when Token is generated (iOS and Android)
      onRegister: async (token) => {
        console.log('📱 Device Token:', token);
        await this.saveDeviceToken(token.token);
        await this.registerDeviceWithServer(token.token);
      },

      // Called when a remote or local notification is opened or received
      onNotification: (notification) => {
        console.log('🔔 Notification received:', notification);

        // Handle notification tap
        if (notification.userInteraction) {
          this.handleNotificationTap(notification);
        }

        // Required on iOS only
        if (Platform.OS === 'ios') {
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        }
      },

      // Android only: GCM or FCM Sender ID
      senderID: '1234567890', // Replace with your FCM sender ID

      // iOS only
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create default channels (Android)
    this.createChannels();
  }

  createChannels() {
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'tasks',
          channelName: 'Task Notifications',
          channelDescription: 'Notifications about assigned tasks',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Tasks channel created: ${created}`)
      );

      PushNotification.createChannel(
        {
          channelId: 'schedules',
          channelName: 'Schedule Notifications',
          channelDescription: 'Notifications about your schedule',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Schedules channel created: ${created}`)
      );

      PushNotification.createChannel(
        {
          channelId: 'alerts',
          channelName: 'Alert Notifications',
          channelDescription: 'Critical alerts (temperature, inventory, etc.)',
          playSound: true,
          soundName: 'default',
          importance: 5,
          vibrate: true,
        },
        (created) => console.log(`Alerts channel created: ${created}`)
      );

      PushNotification.createChannel(
        {
          channelId: 'general',
          channelName: 'General Notifications',
          channelDescription: 'General app notifications',
          playSound: true,
          soundName: 'default',
          importance: 3,
          vibrate: false,
        },
        (created) => console.log(`General channel created: ${created}`)
      );
    }
  }

  async requestPermissions() {
    return new Promise((resolve) => {
      PushNotification.requestPermissions((permissions) => {
        console.log('📱 Notification permissions:', permissions);
        resolve(permissions);
      });
    });
  }

  async checkPermissions() {
    return new Promise((resolve) => {
      PushNotification.checkPermissions((permissions) => {
        resolve(permissions);
      });
    });
  }

  async saveDeviceToken(token) {
    try {
      await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save device token:', error);
    }
  }

  async getDeviceToken() {
    try {
      return await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get device token:', error);
      return null;
    }
  }

  async registerDeviceWithServer(token) {
    try {
      const userId = await AsyncStorage.getItem('@PattyShack:userId');

      if (!userId) {
        console.log('User not logged in, skipping device registration');
        return;
      }

      await api.post('/notifications/register', {
        userId,
        deviceToken: token,
        platform: Platform.OS,
        deviceInfo: {
          os: Platform.OS,
          version: Platform.Version,
        },
      });

      console.log('✅ Device registered with server');
    } catch (error) {
      console.error('Failed to register device with server:', error);
    }
  }

  async unregisterDevice() {
    try {
      const token = await this.getDeviceToken();

      if (!token) return;

      await api.post('/notifications/unregister', { deviceToken: token });
      await AsyncStorage.removeItem(DEVICE_TOKEN_KEY);

      console.log('✅ Device unregistered');
    } catch (error) {
      console.error('Failed to unregister device:', error);
    }
  }

  showLocalNotification(options) {
    PushNotification.localNotification({
      channelId: options.channelId || 'general',
      title: options.title,
      message: options.message,
      playSound: options.playSound !== false,
      soundName: options.soundName || 'default',
      badge: options.badge,
      userInfo: options.data || {},
      largeIcon: options.largeIcon || 'ic_launcher',
      smallIcon: options.smallIcon || 'ic_notification',
    });
  }

  scheduleLocalNotification(options, date) {
    PushNotification.localNotificationSchedule({
      channelId: options.channelId || 'general',
      title: options.title,
      message: options.message,
      date: date,
      playSound: options.playSound !== false,
      soundName: options.soundName || 'default',
      badge: options.badge,
      userInfo: options.data || {},
    });
  }

  cancelLocalNotification(notificationId) {
    PushNotification.cancelLocalNotification(notificationId);
  }

  cancelAllLocalNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  removeAllDeliveredNotifications() {
    PushNotification.removeAllDeliveredNotifications();
  }

  handleNotificationTap(notification) {
    const { data } = notification;

    if (!data) return;

    // Navigate to appropriate screen based on notification type
    switch (data.type) {
      case 'task_assigned':
        // Navigate to task detail
        console.log('Navigate to task:', data.taskId);
        break;

      case 'schedule_published':
        // Navigate to schedule
        console.log('Navigate to schedule:', data.scheduleId);
        break;

      case 'temperature_alert':
        // Navigate to temperature monitoring
        console.log('Navigate to temperature alert:', data.alertId);
        break;

      case 'shift_reminder':
        // Navigate to shift detail
        console.log('Navigate to shift:', data.shiftId);
        break;

      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  async saveNotificationPreferences(preferences) {
    try {
      await AsyncStorage.setItem(
        NOTIFICATION_PREFS_KEY,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  async getNotificationPreferences() {
    try {
      const prefs = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      return prefs
        ? JSON.parse(prefs)
        : {
            tasks: true,
            schedules: true,
            alerts: true,
            general: true,
          };
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return {
        tasks: true,
        schedules: true,
        alerts: true,
        general: true,
      };
    }
  }

  // Convenience methods for common notifications

  notifyTaskAssigned(task) {
    this.showLocalNotification({
      channelId: 'tasks',
      title: 'New Task Assigned',
      message: `${task.title} - Due: ${task.dueDate}`,
      data: { type: 'task_assigned', taskId: task.id },
    });
  }

  notifyShiftReminder(shift, hoursBeforeShift) {
    const shiftDate = new Date(shift.shiftDate + 'T' + shift.startTime);
    const reminderDate = new Date(
      shiftDate.getTime() - hoursBeforeShift * 60 * 60 * 1000
    );

    this.scheduleLocalNotification(
      {
        channelId: 'schedules',
        title: 'Upcoming Shift',
        message: `You have a ${shift.position} shift starting at ${shift.startTime}`,
        data: { type: 'shift_reminder', shiftId: shift.id },
      },
      reminderDate
    );
  }

  notifyTemperatureAlert(alert) {
    this.showLocalNotification({
      channelId: 'alerts',
      title: '⚠️ Temperature Alert',
      message: `${alert.equipmentName}: ${alert.temperature}°F (${alert.alertType})`,
      data: { type: 'temperature_alert', alertId: alert.id },
      playSound: true,
    });
  }

  notifySchedulePublished(schedule) {
    this.showLocalNotification({
      channelId: 'schedules',
      title: 'New Schedule Published',
      message: `Your schedule for ${schedule.weekStart} is now available`,
      data: { type: 'schedule_published', scheduleId: schedule.id },
    });
  }

  notifyLowInventory(item) {
    this.showLocalNotification({
      channelId: 'alerts',
      title: 'Low Inventory Alert',
      message: `${item.itemName}: ${item.currentQuantity} ${item.unit} remaining`,
      data: { type: 'low_inventory', itemId: item.id },
    });
  }

  setApplicationIconBadgeNumber(number) {
    PushNotification.setApplicationIconBadgeNumber(number);
  }

  getApplicationIconBadgeNumber(callback) {
    PushNotification.getApplicationIconBadgeNumber(callback);
  }
}

export default new PushNotificationService();
