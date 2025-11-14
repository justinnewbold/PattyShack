# Mobile Enhancements - Phase 6

Comprehensive mobile app enhancements for offline support, push notifications, and location-based features.

## Features

### 1. Offline Mode Support

**OfflineManager Service** (`mobile/src/services/offlineManager.js`)

- **Offline Queue Management**
  - Automatic queuing of actions when offline
  - Retry mechanism with configurable attempts
  - Status tracking (pending, retrying, failed, synced)
  - Automatic sync when connection restored

- **Data Caching**
  - Local data cache for offline access
  - Version tracking for cache invalidation
  - Automatic cache updates on sync

- **Sync Management**
  - Background sync when online
  - Sync progress callbacks
  - Last sync timestamp tracking
  - Conflict resolution support

- **Usage Example**:
  ```javascript
  import offlineManager from './services/offlineManager';

  // Add action to queue
  await offlineManager.addToQueue({
    type: 'CREATE_TASK',
    endpoint: '/tasks',
    method: 'POST',
    data: taskData
  });

  // Manually trigger sync
  await offlineManager.syncOfflineQueue();

  // Get offline stats
  const stats = await offlineManager.getOfflineStats();
  ```

### 2. Push Notifications

**PushNotificationService** (`mobile/src/services/pushNotificationService.js`)

- **Notification Channels** (Android)
  - Tasks: Task assignments and updates
  - Schedules: Shift reminders and schedule changes
  - Alerts: Critical alerts (temperature, inventory)
  - General: General app notifications

- **Features**
  - Device token management
  - Server registration/unregistration
  - Local notifications
  - Scheduled notifications
  - Badge count management
  - Notification preferences
  - Deep linking on notification tap

- **Convenience Methods**:
  ```javascript
  import pushNotificationService from './services/pushNotificationService';

  // Task notification
  pushNotificationService.notifyTaskAssigned(task);

  // Shift reminder (scheduled)
  pushNotificationService.notifyShiftReminder(shift, hoursBeforeShift);

  // Temperature alert
  pushNotificationService.notifyTemperatureAlert(alert);

  // Schedule published
  pushNotificationService.notifySchedulePublished(schedule);

  // Low inventory
  pushNotificationService.notifyLowInventory(item);
  ```

- **Notification Preferences**:
  - Per-category enable/disable
  - Persistent storage
  - User-configurable settings

### 3. Geolocation Services

**GeolocationService** (`mobile/src/services/geolocationService.js`)

- **Location Tracking**
  - Current position retrieval
  - Continuous position watching
  - High accuracy mode
  - Cached position access

- **Clock-In/Out Verification**
  - Location-based clock-in validation
  - Distance calculation (Haversine formula)
  - Geofence radius checking
  - Override capability for edge cases

- **Geofencing**
  - Multiple geofence support
  - Real-time geofence checking
  - Distance from geofence calculation

- **Usage Example**:
  ```javascript
  import geolocationService from './services/geolocationService';

  // Verify location for clock-in
  const verification = await geolocationService.clockInWithLocation(
    userId,
    locationId,
    {
      latitude: 40.7128,
      longitude: -74.0060,
      radiusMeters: 100
    }
  );

  if (verification.success) {
    // Proceed with clock-in
  } else {
    // Show error or allow override
    if (verification.canOverride) {
      // Allow manager override
    }
  }

  // Check if user is within any geofence
  const geofenceCheck = await geolocationService.checkGeofence(geofences);
  ```

- **Location Preferences**:
  - Enable/disable location tracking
  - Require location for clock-in
  - Geofence radius configuration
  - Background location tracking

### 4. Camera Integration

**CameraService** (`mobile/src/services/cameraService.js`)

- **Photo Capture**
  - Camera photo capture
  - Photo library selection
  - Multiple photo selection
  - Front/back camera selection

- **Image Processing**
  - Automatic image compression
  - Configurable quality and dimensions
  - Base64 encoding support
  - File size formatting

- **Upload Functionality**
  - Single photo upload
  - Multiple photo upload
  - Metadata attachment
  - FormData multipart upload

- **Convenience Methods**:
  ```javascript
  import cameraService from './services/cameraService';

  // Task photo
  const result = await cameraService.captureAndUploadTaskPhoto(
    taskId,
    'Task completed'
  );

  // Temperature photo
  await cameraService.captureAndUploadTemperaturePhoto(
    equipmentId,
    temperature
  );

  // Inventory photo
  await cameraService.captureAndUploadInventoryPhoto(
    itemId,
    count
  );

  // Generic photo capture and upload
  const photo = await cameraService.takePhoto();
  if (photo.success) {
    await cameraService.uploadPhoto(
      photo.photo.uri,
      '/endpoint',
      { metadata: 'value' }
    );
  }
  ```

- **Features**:
  - Permission handling (iOS & Android)
  - Automatic compression before upload
  - Photo deletion
  - Image dimension retrieval
  - File size calculation

### 5. UI Components

**OfflineIndicator** (`mobile/src/components/common/OfflineIndicator.js`)

- Real-time network status display
- Offline queue size indicator
- Manual sync button
- Auto-hide when online with no pending items
- Visual distinction between online/offline states

```javascript
import OfflineIndicator from './components/common/OfflineIndicator';

// In your App.js or navigation component
<View>
  <OfflineIndicator />
  {/* Rest of your app */}
</View>
```

## Dependencies

Add these to your `mobile/package.json`:

```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "^1.19.0",
    "@react-native-community/netinfo": "^11.0.0",
    "@react-native-community/geolocation": "^3.0.0",
    "@react-native-community/push-notification-ios": "^1.11.0",
    "react-native-push-notification": "^8.1.1",
    "react-native-image-picker": "^5.6.0",
    "react-native-fs": "^2.20.0",
    "react-native-image-resizer": "^3.0.5"
  },
  "devDependencies": {
    "@react-native-community/cli-platform-android": "^11.0.0",
    "@react-native-community/cli-platform-ios": "^11.0.0"
  }
}
```

## Setup Instructions

### iOS Configuration

1. **Info.plist permissions**:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>We need camera access to take photos of tasks and inventory</string>

   <key>NSPhotoLibraryUsageDescription</key>
   <string>We need photo library access to select photos</string>

   <key>NSLocationWhenInUseUsageDescription</key>
   <string>We need location access to verify clock-in/out</string>

   <key>NSLocationAlwaysUsageDescription</key>
   <string>We need location access for geofencing features</string>
   ```

2. **Install pods**:
   ```bash
   cd ios && pod install
   ```

### Android Configuration

1. **AndroidManifest.xml permissions**:
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   <uses-permission android:name="android.permission.INTERNET" />
   ```

2. **Notification configuration**:
   - Add Firebase Cloud Messaging (FCM) configuration
   - Download `google-services.json` and place in `android/app/`

## Best Practices

### Offline Support

1. **Always check network status** before making API calls
2. **Queue critical actions** when offline
3. **Show visual feedback** to users about offline status
4. **Cache frequently accessed data** for offline viewing
5. **Implement conflict resolution** for offline edits

### Push Notifications

1. **Request permissions** at appropriate times (not immediately on app launch)
2. **Respect user preferences** for notification types
3. **Clear notifications** when user views related content
4. **Use channels** to allow granular control
5. **Deep link** to relevant screens on notification tap

### Geolocation

1. **Request permission** with clear explanation
2. **Handle permission denial** gracefully
3. **Show distance** when location verification fails
4. **Allow overrides** for edge cases (manager approval)
5. **Optimize battery** by limiting background tracking

### Camera

1. **Request permissions** before launching camera
2. **Compress images** before upload to save bandwidth
3. **Show upload progress** for better UX
4. **Handle failures** gracefully
5. **Clean up temporary files** after upload

## Testing

### Offline Mode

1. Enable airplane mode
2. Perform actions (create task, log temperature, etc.)
3. Check offline queue status
4. Disable airplane mode
5. Verify automatic sync

### Push Notifications

1. Register device with server
2. Trigger notifications from server
3. Test notification tap handling
4. Verify deep linking
5. Test notification preferences

### Geolocation

1. Test clock-in within geofence
2. Test clock-in outside geofence
3. Verify distance calculations
4. Test override functionality
5. Check permission flows

### Camera

1. Test camera capture
2. Test library selection
3. Verify image compression
4. Test upload functionality
5. Check permission handling

## Troubleshooting

### Offline Sync Issues

- Check network status indicator
- Verify queue contains expected items
- Check for API errors in failed items
- Clear queue if corrupted

### Notification Issues

- Verify device token registration
- Check notification permissions
- Verify channel configuration (Android)
- Check server-side notification sending

### Location Issues

- Verify GPS is enabled
- Check location permissions
- Ensure high accuracy mode is enabled
- Test in open area (not indoors)

### Camera Issues

- Check camera permissions
- Verify storage permissions
- Ensure camera is not in use by another app
- Check file system permissions

## Future Enhancements

- Background sync scheduling
- Intelligent sync prioritization
- Rich push notifications (images, actions)
- Geofence-triggered notifications
- AR-based inventory scanning
- Voice commands for hands-free operation
- Biometric authentication
- Offline-first architecture
