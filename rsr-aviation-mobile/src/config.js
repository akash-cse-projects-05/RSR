import { Platform } from 'react-native';

const getBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return `http://${window.location.hostname}:3000`;
  }

  return 'http://192.168.0.103:3000';
};

export const API_BASE_URL = getBaseUrl();

