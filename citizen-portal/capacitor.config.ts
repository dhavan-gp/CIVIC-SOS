import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.civicsos.citizen',
  appName: 'CIVIC-SOS Citizen',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: ['*']
  },
  plugins: {
    Camera: {
      permissionsType: 'camera'
    },
    Geolocation: {
      // Configuration for native high-accuracy GPS
    }
  }
};

export default config;
