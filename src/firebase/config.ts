import { FirebaseOptions } from 'firebase/app';

/**
 * Firebase configuration object.
 * We use environment variables for better security and portability across environments like Vercel.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB08ZbfRZIfdDXjYBwA5hivWJEt7cqq2lo',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'studio-1413684383-379c9.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-1413684383-379c9',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-1413684383-379c9.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '271369109791',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:271369109791:web:3752b36b02a',
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
