import { FirebaseOptions } from 'firebase/app';

// WARNING: This is a placeholder configuration.
// You must replace these values with your actual Firebase project configuration
// from the Firebase console.
const firebaseConfig: FirebaseOptions = {
  apiKey: 'REPLACE_WITH_YOUR_API_KEY',
  authDomain: 'REPLACE_WITH_YOUR_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_YOUR_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_YOUR_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_YOUR_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_YOUR_APP_ID',
  measurementId: 'REPLACE_WITH_YOUR_MEASUREMENT_ID',
};

export function getFirebaseConfig(): FirebaseOptions {
  if (
    !firebaseConfig.apiKey ||
    firebaseConfig.apiKey === 'REPLACE_WITH_YOUR_API_KEY'
  ) {
    console.warn(
      'Firebase config is not set. Please replace the placeholder values in src/firebase/config.ts with your actual Firebase project configuration. The app will not work correctly with Firebase services.'
    );
  }
  return firebaseConfig;
}
