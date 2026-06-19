import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name:        'FoodScanner',
  slug:        'food-scanner',
  version:     '1.0.0',
  orientation: 'portrait',
  scheme:      'foodscanner',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.yourname.foodscanner',
    infoPlist: {
      NSCameraUsageDescription: 'Used to scan barcodes and capture product images.',
    },
  },
  android: {
    package: 'com.yourname.foodscanner',
    adaptiveIcon: { backgroundColor: '#0E0E10' },
    permissions: ['CAMERA'],
  },
  plugins: [
    'expo-router',
    ['expo-camera', { cameraPermission: 'Used to scan barcodes and capture product photos.' }],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
