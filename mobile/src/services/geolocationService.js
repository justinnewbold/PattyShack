/**
 * Geolocation Service
 * Handles location tracking for clock-in/out, geofencing, and location verification
 */

import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_PREFS_KEY = '@PattyShack:location_prefs';

class GeolocationService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
  }

  async requestPermission() {
    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        Geolocation.requestAuthorization(
          () => resolve(true),
          (error) => {
            console.error('Location permission denied:', error);
            resolve(false);
          }
        );
      });
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'PattyShack needs access to your location for clock-in/out verification',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Location permission error:', error);
        return false;
      }
    }

    return false;
  }

  getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = position;
          resolve(position);
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: options.enableHighAccuracy !== false,
          timeout: options.timeout || 15000,
          maximumAge: options.maximumAge || 10000,
        }
      );
    });
  }

  watchPosition(callback, errorCallback) {
    this.watchId = Geolocation.watchPosition(
      (position) => {
        this.currentPosition = position;
        callback(position);
      },
      (error) => {
        console.error('Watch position error:', error);
        if (errorCallback) errorCallback(error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds (Android)
        fastestInterval: 2000, // Fastest update interval (Android)
      }
    );

    return this.watchId;
  }

  clearWatch() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters

    return distance;
  }

  isWithinRadius(userLat, userLon, locationLat, locationLon, radiusMeters) {
    const distance = this.calculateDistance(
      userLat,
      userLon,
      locationLat,
      locationLon
    );

    return {
      isWithin: distance <= radiusMeters,
      distance: Math.round(distance),
      distanceMiles: (distance * 0.000621371).toFixed(2),
    };
  }

  async verifyLocationForClockIn(location) {
    try {
      const position = await this.getCurrentPosition();

      const verification = this.isWithinRadius(
        position.coords.latitude,
        position.coords.longitude,
        location.latitude,
        location.longitude,
        location.radiusMeters || 100 // Default 100 meter radius
      );

      return {
        success: verification.isWithin,
        position: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        },
        distance: verification.distance,
        distanceMiles: verification.distanceMiles,
        message: verification.isWithin
          ? 'Location verified'
          : `You are ${verification.distanceMiles} miles away from the location`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Unable to verify location. Please check your GPS settings.',
      };
    }
  }

  async getAddressFromCoordinates(latitude, longitude) {
    try {
      // Using a reverse geocoding API (e.g., Google Maps Geocoding API)
      // This is a placeholder - implement with your preferred geocoding service
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_API_KEY`
      );

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        return {
          success: true,
          address: data.results[0].formatted_address,
          addressComponents: data.results[0].address_components,
        };
      }

      return {
        success: false,
        error: 'No address found',
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async saveLocationPreferences(preferences) {
    try {
      await AsyncStorage.setItem(
        LOCATION_PREFS_KEY,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Failed to save location preferences:', error);
    }
  }

  async getLocationPreferences() {
    try {
      const prefs = await AsyncStorage.getItem(LOCATION_PREFS_KEY);
      return prefs
        ? JSON.parse(prefs)
        : {
            enableLocationTracking: true,
            requireLocationForClockIn: true,
            geofenceRadius: 100, // meters
            trackLocationInBackground: false,
          };
    } catch (error) {
      console.error('Failed to get location preferences:', error);
      return {
        enableLocationTracking: true,
        requireLocationForClockIn: true,
        geofenceRadius: 100,
        trackLocationInBackground: false,
      };
    }
  }

  async clockInWithLocation(userId, locationId, locationCoordinates) {
    try {
      const verification = await this.verifyLocationForClockIn(
        locationCoordinates
      );

      if (!verification.success) {
        return {
          success: false,
          error: 'location_verification_failed',
          message: verification.message,
          canOverride: verification.distance < 500, // Allow override if within 500 meters
        };
      }

      return {
        success: true,
        position: verification.position,
        distance: verification.distance,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Clock-in location error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async clockOutWithLocation(userId, locationId, locationCoordinates) {
    try {
      const position = await this.getCurrentPosition();

      return {
        success: true,
        position: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Clock-out location error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  formatCoordinates(latitude, longitude) {
    const latDirection = latitude >= 0 ? 'N' : 'S';
    const lonDirection = longitude >= 0 ? 'E' : 'W';

    return `${Math.abs(latitude).toFixed(6)}° ${latDirection}, ${Math.abs(
      longitude
    ).toFixed(6)}° ${lonDirection}`;
  }

  async checkGeofence(geofences) {
    try {
      const position = await this.getCurrentPosition();

      const insideGeofences = [];

      for (const geofence of geofences) {
        const verification = this.isWithinRadius(
          position.coords.latitude,
          position.coords.longitude,
          geofence.latitude,
          geofence.longitude,
          geofence.radius
        );

        if (verification.isWithin) {
          insideGeofences.push({
            ...geofence,
            distance: verification.distance,
          });
        }
      }

      return {
        success: true,
        position: position.coords,
        insideGeofences,
        isInsideAnyGeofence: insideGeofences.length > 0,
      };
    } catch (error) {
      console.error('Geofence check error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  getCachedPosition() {
    return this.currentPosition;
  }
}

export default new GeolocationService();
