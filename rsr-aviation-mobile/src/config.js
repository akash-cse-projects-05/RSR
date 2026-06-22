import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return `http://${window.location.hostname}:5000`;
  }
  return 'http://192.168.0.155:5000';
};

export const API_BASE_URL = getBaseUrl();

