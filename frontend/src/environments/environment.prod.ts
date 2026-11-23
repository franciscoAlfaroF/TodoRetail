import { Capacitor } from '@capacitor/core';

export const environment = {
  production: true,
  apiUrl: Capacitor.isNativePlatform()
    ? 'http://localhost:3000/api'
    : '/api',
};
