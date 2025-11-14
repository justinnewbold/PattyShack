/**
 * Camera Service
 * Handles camera functionality, photo capture, compression, and upload
 */

import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';
import api from '../config/api';

class CameraService {
  constructor() {
    this.defaultOptions = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
      includeBase64: false,
      saveToPhotos: false,
    };
  }

  async requestCameraPermission() {
    if (Platform.OS === 'ios') {
      return true; // iOS handles permissions via info.plist
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'PattyShack needs access to your camera to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Camera permission error:', error);
        return false;
      }
    }

    return false;
  }

  async requestStoragePermission() {
    if (Platform.OS === 'ios') {
      return true;
    }

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Storage Permission',
            message: 'PattyShack needs access to your photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Storage permission error:', error);
        return false;
      }
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'PattyShack needs access to your photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Storage permission error:', error);
        return false;
      }
    }

    return false;
  }

  async takePhoto(options = {}) {
    const hasPermission = await this.requestCameraPermission();

    if (!hasPermission) {
      return {
        success: false,
        error: 'Camera permission denied',
      };
    }

    return new Promise((resolve) => {
      launchCamera(
        {
          ...this.defaultOptions,
          ...options,
          cameraType: options.cameraType || 'back',
        },
        (response) => {
          if (response.didCancel) {
            resolve({
              success: false,
              cancelled: true,
            });
          } else if (response.errorCode) {
            resolve({
              success: false,
              error: response.errorMessage,
            });
          } else if (response.assets && response.assets.length > 0) {
            resolve({
              success: true,
              photo: response.assets[0],
            });
          }
        }
      );
    });
  }

  async selectFromLibrary(options = {}) {
    const hasPermission = await this.requestStoragePermission();

    if (!hasPermission) {
      return {
        success: false,
        error: 'Storage permission denied',
      };
    }

    return new Promise((resolve) => {
      launchImageLibrary(
        {
          ...this.defaultOptions,
          ...options,
          selectionLimit: options.selectionLimit || 1,
        },
        (response) => {
          if (response.didCancel) {
            resolve({
              success: false,
              cancelled: true,
            });
          } else if (response.errorCode) {
            resolve({
              success: false,
              error: response.errorMessage,
            });
          } else if (response.assets && response.assets.length > 0) {
            resolve({
              success: true,
              photos: response.assets,
            });
          }
        }
      );
    });
  }

  async compressImage(uri, options = {}) {
    try {
      const result = await ImageResizer.createResizedImage(
        uri,
        options.maxWidth || 1920,
        options.maxHeight || 1920,
        options.format || 'JPEG',
        options.quality || 80,
        0, // rotation
        null, // outputPath
        false, // keepMeta
        options
      );

      return {
        success: true,
        uri: result.uri,
        size: result.size,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('Image compression error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getImageBase64(uri) {
    try {
      const base64 = await RNFS.readFile(uri, 'base64');
      return {
        success: true,
        base64,
      };
    } catch (error) {
      console.error('Read image error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async uploadPhoto(uri, endpoint, metadata = {}) {
    try {
      // Compress image before upload
      const compressed = await this.compressImage(uri);

      if (!compressed.success) {
        return compressed;
      }

      const formData = new FormData();

      formData.append('photo', {
        uri: compressed.uri,
        type: 'image/jpeg',
        name: `photo-${Date.now()}.jpg`,
      });

      // Add metadata
      Object.keys(metadata).forEach((key) => {
        formData.append(key, metadata[key]);
      });

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Photo upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async uploadMultiplePhotos(uris, endpoint, metadata = {}) {
    try {
      const formData = new FormData();

      // Compress and add all photos
      for (let i = 0; i < uris.length; i++) {
        const compressed = await this.compressImage(uris[i]);

        if (compressed.success) {
          formData.append('photos', {
            uri: compressed.uri,
            type: 'image/jpeg',
            name: `photo-${Date.now()}-${i}.jpg`,
          });
        }
      }

      // Add metadata
      Object.keys(metadata).forEach((key) => {
        formData.append(key, JSON.stringify(metadata[key]));
      });

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Multiple photos upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async captureAndUploadTaskPhoto(taskId, notes = '') {
    const photoResult = await this.takePhoto({
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
    });

    if (!photoResult.success) {
      return photoResult;
    }

    return await this.uploadPhoto(
      photoResult.photo.uri,
      `/tasks/${taskId}/photos`,
      {
        taskId,
        notes,
        timestamp: Date.now(),
      }
    );
  }

  async captureAndUploadTemperaturePhoto(equipmentId, temperature) {
    const photoResult = await this.takePhoto({
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
    });

    if (!photoResult.success) {
      return photoResult;
    }

    return await this.uploadPhoto(
      photoResult.photo.uri,
      `/temperatures/equipment/${equipmentId}/photos`,
      {
        equipmentId,
        temperature,
        timestamp: Date.now(),
      }
    );
  }

  async captureAndUploadInventoryPhoto(itemId, count) {
    const photoResult = await this.takePhoto({
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
    });

    if (!photoResult.success) {
      return photoResult;
    }

    return await this.uploadPhoto(
      photoResult.photo.uri,
      `/inventory/${itemId}/photos`,
      {
        itemId,
        count,
        timestamp: Date.now(),
      }
    );
  }

  async getImageDimensions(uri) {
    try {
      const info = await RNFS.stat(uri);

      return {
        success: true,
        size: info.size,
      };
    } catch (error) {
      console.error('Get image dimensions error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deletePhoto(uri) {
    try {
      const exists = await RNFS.exists(uri);

      if (exists) {
        await RNFS.unlink(uri);
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Delete photo error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export default new CameraService();
