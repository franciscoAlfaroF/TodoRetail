import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.todoretail.app',
  appName: 'TodoRetail',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'http',
  },
};

export default config;
