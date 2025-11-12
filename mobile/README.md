# PattyShack Mobile App

Native iOS and Android mobile apps for the PattyShack Restaurant Operations Platform, built with React Native and Expo.

## 🚀 Features

- **Authentication** - Login and registration with JWT tokens
- **Dashboard** - Overview of tasks, alerts, and quick actions
- **Task Management** - View, complete, and track tasks with photo verification
- **Temperature Monitoring** - Log equipment temperatures and view alerts
- **Inventory Management** - Real-time inventory tracking with barcode scanning
- **Employee Scheduling** - View schedules and clock in/out
- **Offline Mode** - Work offline and sync when connection is restored
- **Push Notifications** - Real-time alerts for critical events
- **Camera Integration** - Photo capture for task verification
- **Barcode Scanning** - Fast inventory counting

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI** (for building): `npm install -g eas-cli`

### For iOS Development:
- **macOS** with Xcode 14+
- **iOS Simulator** or physical iOS device
- **Apple Developer Account** (for App Store deployment)

### For Android Development:
- **Android Studio** with Android SDK
- **Android Emulator** or physical Android device
- **Google Play Developer Account** (for Play Store deployment)

## 🔧 Installation

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API endpoint:**
   Edit `src/config/api.js` and set your backend API URL:
   ```javascript
   const API_BASE_URL = __DEV__
     ? 'http://localhost:3000/api/v1'  // Development
     : 'https://your-production-api.com/api/v1';  // Production
   ```

## 🏃 Running the App

### Development Mode (Expo Go)

The fastest way to test the app during development:

1. **Start Expo dev server:**
   ```bash
   npm start
   ```

2. **Run on iOS:**
   ```bash
   npm run ios
   ```
   - Opens iOS Simulator automatically
   - Or scan QR code with Camera app on physical iOS device

3. **Run on Android:**
   ```bash
   npm run android
   ```
   - Opens Android Emulator automatically
   - Or scan QR code with Expo Go app on physical Android device

### Using Expo Go App

1. Install **Expo Go** on your device:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Run `npm start` and scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

## 📦 Building for Production

### Setup EAS (Expo Application Services)

1. **Login to Expo:**
   ```bash
   eas login
   ```

2. **Configure project:**
   ```bash
   eas build:configure
   ```

### Building for iOS

1. **Create iOS build:**
   ```bash
   eas build --platform ios
   ```

2. **Choose build type:**
   - Development build (for testing)
   - Ad Hoc (for internal distribution)
   - App Store (for submission)

3. **Download and install:**
   - Build completes in Expo cloud
   - Download `.ipa` file or install via link

4. **Submit to App Store:**
   ```bash
   eas submit --platform ios
   ```

### Building for Android

1. **Create Android build:**
   ```bash
   eas build --platform android
   ```

2. **Choose build type:**
   - APK (for testing/sideloading)
   - AAB (for Play Store)

3. **Download and install:**
   - Download `.apk` or `.aab` file
   - Install directly or upload to Play Store

4. **Submit to Play Store:**
   ```bash
   eas submit --platform android
   ```

## 🔑 API Configuration

The app connects to the PattyShack backend API. Ensure your backend is running:

```bash
# In the main PattyShack directory
npm start
```

Backend should be available at `http://localhost:3000`

## 📱 App Permissions

The app requires the following permissions:

### iOS (Info.plist)
- **Camera**: Photo capture for tasks and temperatures
- **Photo Library**: Image uploads
- **Location**: Geofencing for clock-in verification

### Android (AndroidManifest.xml)
- **CAMERA**: Photo capture
- **READ_EXTERNAL_STORAGE**: Access photos
- **WRITE_EXTERNAL_STORAGE**: Save photos
- **ACCESS_FINE_LOCATION**: GPS location
- **ACCESS_COARSE_LOCATION**: Network location

## 🗂️ Project Structure

```
mobile/
├── App.js                      # Root component
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── babel.config.js             # Babel configuration
│
└── src/
    ├── navigation/             # Navigation setup
    │   └── AppNavigator.js
    │
    ├── screens/                # App screens
    │   ├── Auth/               # Login, Register
    │   ├── Dashboard/          # Dashboard
    │   ├── Tasks/              # Tasks list and detail
    │   ├── Temperatures/       # Temperature logging
    │   ├── Inventory/          # Inventory management
    │   ├── Schedules/          # Schedule and clock-in
    │   └── Profile/            # User profile
    │
    ├── services/               # API services
    │   ├── authService.js
    │   ├── tasksService.js
    │   ├── temperaturesService.js
    │   ├── inventoryService.js
    │   ├── schedulesService.js
    │   └── analyticsService.js
    │
    ├── context/                # React Context
    │   └── AuthContext.jsx     # Authentication state
    │
    ├── config/                 # Configuration
    │   └── api.js              # API client setup
    │
    ├── utils/                  # Utilities
    │   └── offlineStorage.js   # Offline mode
    │
    └── theme.js                # App theme
```

## 🎨 Customization

### Theme Colors

Edit `src/theme.js` to customize colors:

```javascript
const customColors = {
  primary: '#FF6B35',        // Brand primary
  secondary: '#F7931E',      // Brand secondary
  tertiary: '#004E89',       // Brand tertiary
  success: '#10B981',        // Success states
  warning: '#F59E0B',        // Warning states
  error: '#EF4444',          // Error states
};
```

### App Icon and Splash Screen

1. Replace `assets/icon.png` (1024x1024)
2. Replace `assets/splash.png` (1284x2778)
3. Replace `assets/adaptive-icon.png` (Android, 1024x1024)

## 🐛 Troubleshooting

### Common Issues

**1. Metro bundler errors:**
```bash
# Clear cache and restart
expo start -c
```

**2. iOS build fails:**
```bash
# Clear Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

**3. Android build fails:**
```bash
# Clear Gradle cache
cd android
./gradlew clean
```

**4. API connection fails:**
- Check backend is running
- Verify API_BASE_URL in `src/config/api.js`
- For physical devices, use your computer's IP instead of localhost

## 📊 Testing

### Running Tests
```bash
# Run test suite
npm test

# Run with coverage
npm test -- --coverage
```

### Manual Testing Checklist
- [ ] Login with valid credentials
- [ ] View dashboard and stats
- [ ] Complete a task
- [ ] Log a temperature
- [ ] Scan barcode for inventory
- [ ] Clock in/out
- [ ] Test offline mode
- [ ] Receive push notification

## 🚀 Deployment

### iOS App Store

1. **Requirements:**
   - Apple Developer Account ($99/year)
   - App Store Connect access
   - Valid certificates and provisioning profiles

2. **Build and submit:**
   ```bash
   eas build --platform ios
   eas submit --platform ios
   ```

3. **App Store Connect:**
   - Fill out app information
   - Upload screenshots (5.5" and 6.5" displays)
   - Submit for review

### Google Play Store

1. **Requirements:**
   - Google Play Developer Account ($25 one-time)
   - Signed AAB file
   - Store listing assets

2. **Build and submit:**
   ```bash
   eas build --platform android
   eas submit --platform android
   ```

3. **Play Console:**
   - Create store listing
   - Upload screenshots and graphics
   - Submit for review

## 🔐 Security Notes

- Never commit API keys or secrets to git
- Use environment variables for sensitive data
- Enable SSL/TLS for API communications
- Implement certificate pinning for production
- Use Expo's SecureStore for sensitive data

## 📄 License

ISC License - See main project LICENSE file

## 🤝 Support

For support, please contact the development team or open an issue on GitHub.

---

**Built with ❤️ for restaurant operators everywhere**
