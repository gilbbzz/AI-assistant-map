// capacitor.config.ts - Konfigurasi untuk build APK Android
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.routeai.app',
  appName: 'RouteAI',
  webDir: 'build',
  bundledWebRuntime: false,

  server: {
    // Untuk development: uncomment baris di bawah agar live reload ke backend lokal
    // url: 'http://192.168.1.x:3000',
    // cleartext: true,
    androidScheme: 'https'
  },

  android: {
    buildOptions: {
      keystorePath: 'routeai.keystore',
      keystoreAlias: 'routeai',
    },
    // Izin Android yang dibutuhkan
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },

  plugins: {
    // Geolocation - izin lokasi
    Geolocation: {
      permissions: {
        android: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'ACCESS_BACKGROUND_LOCATION']
      }
    },

    // Push Notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },

    // Local Notifications (offline alerts)
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#6B5CE7',
      sound: 'beep.wav'
    },

    // Text to Speech - navigasi suara
    TextToSpeech: {
      androidVoice: 'id-ID'
    },

    // HTTP config
    CapacitorHttp: {
      enabled: true
    },

    // Splash Screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0D1117',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },

    // Status Bar
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0D1117',
      overlaysWebView: false
    }
  }
};

export default config;
