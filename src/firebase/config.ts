import { FirebaseOptions } from 'firebase/app';

/**
 * Firebase configuration object.
 * We use environment variables with hardcoded fallbacks to ensure connectivity 
 * even if the environment injection fails during deployment.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCM1tpR8adevIgBUuijtjeF0BfSztIWCZw',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'studio-1413684383-379c9.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-1413684383-379c9',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-1413684383-379c9.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '271369109791',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:271369109791:web:826d6a1d386e9b1c36b02a',
};

export function getFirebaseConfig(): FirebaseOptions {
  return firebaseConfig;
}
