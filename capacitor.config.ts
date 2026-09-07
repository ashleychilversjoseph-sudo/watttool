import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chilverselectricalservices.sparkytoolkit',
  appName: 'WATTtool',
  webDir: 'dist',
  android: {
    backgroundColor: '#050506',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 450,
      backgroundColor: '#050506',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
