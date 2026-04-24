import { FirebaseOptions } from 'firebase/app';

/**
 * Firebase configuration object.
 * We use environment variables for better security and portability across environments like Vercel.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
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
