import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trailog.app',
  appName: 'TrailLog',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
