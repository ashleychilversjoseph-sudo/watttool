import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chilverselectricalservices.sparkytoolkit',
  appName: 'WATTtool',
  webDir: 'dist',
  android: {
    backgroundColor: '#050506',
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 450,
      backgroundColor: '#050506',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
