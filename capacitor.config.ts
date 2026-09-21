import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nantor.sourcingapp',
  appName: 'Nantor Sourcing App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
