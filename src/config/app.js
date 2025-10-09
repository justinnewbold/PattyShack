/**
 * Application Configuration
 */

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  apiPrefix: '/api/v1',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'pattyshack-secret-change-in-production',
    expiresIn: '24h'
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
  },
  
  // IoT Sensor Configuration
  iot: {
    temperatureThresholds: {
      refrigerator: { min: 33, max: 40 }, // Fahrenheit
      freezer: { min: -10, max: 10 },
      hotHolding: { min: 135, max: 165 }
    },
    alertChannels: ['mobile', 'email', 'sms']
  },
  
  // Notification Configuration
  notifications: {
    enabled: true,
    providers: ['email', 'sms', 'push']
  }
};
