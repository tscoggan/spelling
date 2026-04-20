import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spellingplayground.app',
  appName: 'Spelling Playground',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    TextToSpeech: {
      // Uses system default TTS engine on both iOS and Android
    },
  },
};

export default config;
