import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spellingplayground.app',
  appName: 'Spelling Playground',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Route all fetch/XHR through the native HTTP stack so the session cookie
    // set by https://spellingplayground.com is stored in the native cookie jar
    // and re-sent on every request. Without this, iOS WKWebView treats that
    // cookie as third-party (the WebView origin is capacitor://localhost) and
    // drops it, so every authenticated call returns 401 — e.g. family signup
    // succeeded but "send verification email" failed with 401. CapacitorCookies
    // makes document.cookie use the same native jar.
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorCookies: {
      enabled: true,
    },
    TextToSpeech: {
      // Uses system default TTS engine on both iOS and Android
    },
  },
};

export default config;
