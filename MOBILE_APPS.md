# PattyShack - Complete Platform Guide

## 🍔 Overview

PattyShack is a complete restaurant operations management platform with **three fully functional applications**:

1. **Web Application** - React-based responsive web app
2. **iOS Mobile App** - Native iOS app built with React Native/Expo
3. **Android Mobile App** - Native Android app built with React Native/Expo

All three platforms share the same backend API and provide a consistent user experience across devices.

---

## 🌐 Web Application

### Technology Stack
- React 18 + Vite
- Tailwind CSS
- React Router v6
- Recharts for analytics
- Axios for API calls

### Getting Started

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Start backend (Terminal 1)
cd ..
npm start

# Start frontend (Terminal 2)
cd frontend
npm run dev
```

**Access:** http://localhost:5173

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Deploy to Vercel
vercel deploy
```

---

## 📱 Mobile Applications (iOS + Android)

### Technology Stack
- React Native 0.76
- Expo 52
- React Navigation
- React Native Paper (Material Design)
- Expo Camera & Barcode Scanner
- AsyncStorage for offline mode

### Getting Started

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Key Mobile Features

✅ **Cross-Platform** - Single codebase for iOS and Android
✅ **Native Camera** - Photo capture for task verification
✅ **Barcode Scanner** - Fast inventory counting
✅ **Offline Mode** - Work without internet, sync later
✅ **Push Notifications** - Real-time alerts
✅ **Geolocation** - Clock-in verification
✅ **Material Design** - Native look and feel

---

## 🏗️ Building Production Apps

### iOS App Store Build

```bash
cd mobile

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

**Requirements:**
- Apple Developer Account ($99/year)
- Xcode 14+ (macOS only)
- Valid certificates and provisioning profiles

### Google Play Store Build

```bash
cd mobile

# Build for Android
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

**Requirements:**
- Google Play Developer Account ($25 one-time)
- Android Studio (optional, for local builds)
- Signed AAB file

---

## 📊 Feature Comparison

| Feature | Web | iOS | Android |
|---------|-----|-----|---------|
| Dashboard | ✅ | ✅ | ✅ |
| Task Management | ✅ | ✅ | ✅ |
| Temperature Logging | ✅ | ✅ | ✅ |
| Inventory Management | ✅ | ✅ | ✅ |
| Barcode Scanning | ❌ | ✅ | ✅ |
| Camera Integration | Limited | ✅ | ✅ |
| Offline Mode | Limited | ✅ | ✅ |
| Push Notifications | ❌ | ✅ | ✅ |
| Geolocation | Limited | ✅ | ✅ |
| Schedules | ✅ | ✅ | ✅ |
| Analytics | ✅ | ✅ | ✅ |
| Multi-location | ✅ | ✅ | ✅ |

---

## 🔧 Backend API

All platforms connect to the same Node.js/Express backend:

```bash
# Start backend server
npm start
```

**API Endpoints:** http://localhost:3000/api/v1
**API Documentation:** http://localhost:3000/api/v1/docs

### Supported Endpoints

- `/auth` - Authentication (login, register, logout)
- `/tasks` - Task management
- `/temperatures` - Temperature monitoring
- `/inventory` - Inventory control
- `/schedules` - Employee scheduling
- `/analytics` - Reports and dashboards
- `/locations` - Location management
- `/invoices` - Invoice processing

---

## 📁 Complete Project Structure

```
PattyShack/
│
├── 🌐 Web Application
│   ├── frontend/               # React web app
│   │   ├── src/
│   │   │   ├── pages/         # 10 pages
│   │   │   ├── components/    # 4 components
│   │   │   └── services/      # 8 API services
│   │   └── package.json
│   │
│   └── src/                   # Backend
│       ├── server/
│       ├── routes/            # 8 API routers
│       ├── services/          # 10 services
│       └── database/
│
├── 📱 Mobile Applications
│   └── mobile/                # React Native app
│       ├── src/
│       │   ├── screens/       # 12 screens
│       │   │   ├── Auth/
│       │   │   ├── Dashboard/
│       │   │   ├── Tasks/
│       │   │   ├── Temperatures/
│       │   │   ├── Inventory/
│       │   │   ├── Schedules/
│       │   │   └── Profile/
│       │   ├── services/      # 6 API services
│       │   ├── navigation/
│       │   └── utils/
│       ├── App.js
│       ├── app.json           # Expo config
│       └── package.json
│
└── 📄 Documentation
    ├── README.md              # Main docs
    ├── MOBILE_APPS.md         # This file
    ├── AUTHENTICATION.md
    ├── DATABASE_SETUP.md
    ├── TESTING.md
    └── docs/
```

---

## 🚀 Quick Start Guide

### Option 1: Full Stack (All Platforms)

```bash
# Terminal 1: Backend
npm install
npm start

# Terminal 2: Web Frontend
cd frontend
npm install
npm run dev

# Terminal 3: Mobile App
cd mobile
npm install
npm start
```

### Option 2: Backend + Web Only

```bash
# Terminal 1: Backend
npm install
npm start

# Terminal 2: Web Frontend
cd frontend
npm install
npm run dev
```

### Option 3: Backend + Mobile Only

```bash
# Terminal 1: Backend
npm install
npm start

# Terminal 2: Mobile App
cd mobile
npm install
npm start
```

---

## 🎯 User Roles

All platforms support role-based access:

- **Crew** - Task completion, temperature logging, clock in/out
- **Manager** - Full location management, approvals
- **District** - Multi-location oversight
- **Regional** - Regional performance monitoring
- **Corporate** - Enterprise-wide access

---

## 🔐 Security

- **JWT Authentication** - Secure token-based auth
- **Role-Based Access** - Permissions by user role
- **API Rate Limiting** - Prevent abuse
- **HTTPS/SSL** - Encrypted communications
- **Audit Logging** - Track all user actions
- **Data Encryption** - Secure sensitive data

---

## 📈 Performance

### Web App
- **Lighthouse Score:** 90+
- **First Contentful Paint:** <1.5s
- **Time to Interactive:** <3.5s

### Mobile Apps
- **App Size:** ~40MB
- **Cold Start:** <2s
- **Offline Support:** Full functionality
- **Battery Impact:** Low

---

## 🧪 Testing

### Backend Tests
```bash
npm test                    # Run all tests
npm run test:integration    # Integration tests
npm run test:unit          # Unit tests
npm run test:coverage      # Coverage report
```

### Mobile App Tests
```bash
cd mobile
npm test
```

---

## 📦 Deployment

### Web Application
- **Platform:** Vercel, Netlify, AWS, etc.
- **Build:** `npm run build`
- **Deploy:** Push to GitHub (auto-deploy)

### Mobile Applications
- **iOS:** TestFlight → App Store
- **Android:** Internal Testing → Play Store
- **OTA Updates:** Expo Updates (instant updates)

---

## 💡 Tips for Success

1. **Start with Backend** - Get API running first
2. **Test Web App** - Verify all features work
3. **Build Mobile** - Use web app as reference
4. **Use Demo Data** - Auto-seeded on startup
5. **Read Docs** - Check `/docs` folder

---

## 📞 Support

- **Documentation:** `/docs` folder
- **API Docs:** http://localhost:3000/api/v1/docs
- **Issues:** GitHub Issues
- **Email:** support@pattyshack.com

---

## 🎉 What's Included

✅ Complete backend API (45+ endpoints)
✅ Responsive web application
✅ Native iOS app
✅ Native Android app
✅ Authentication & authorization
✅ 11 database tables with migrations
✅ Comprehensive API documentation
✅ Test suite with 50+ tests
✅ Deployment configurations
✅ Development tools & scripts

---

**Built with ❤️ for restaurant operators everywhere**

*PattyShack - One Platform, Three Apps, Infinite Possibilities*
