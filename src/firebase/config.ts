import { FirebaseOptions } from 'firebase/app';

// El bucket estándar de Firebase para este proyecto debe ser [PROJECT_ID].firebasestorage.app
const firebaseConfig: FirebaseOptions = {
  projectId: 'studio-1413684383-379c9',
  appId: '1:271369109791:web:3752b36b02a',
  apiKey: 'AIzaSyB08ZbfRZIfdDXjYBwA5hivWJEt7cqq2lo',
  authDomain: 'studio-1413684383-379c9.firebaseapp.com',
  storageBucket: 'studio-1413684383-379c9.firebasestorage.app',
  messagingSenderId: '271369109791',
};

export function getFirebaseConfig(): FirebaseOptions {
  if (
    !firebaseConfig.apiKey ||
    firebaseConfig.apiKey === 'REPLACE_WITH_YOUR_API_KEY'
  ) {
    console.warn(
      'Firebase config is not set. Please replace the placeholder values in src/firebase/config.ts with your actual Firebase project configuration.'
    );
  }
  return firebaseConfig;
}
