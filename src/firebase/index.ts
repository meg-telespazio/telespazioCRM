'use client';
import {
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

import { getFirebaseConfig } from './config';
import { useUser } from './auth/use-user';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';
import {
  FirebaseProvider,
  useFirebaseApp,
  useAuth,
  useFirestore,
  useStorage,
} from './provider';
import { FirebaseClientProvider } from './client-provider';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

function initializeFirebase(config: FirebaseOptions) {
  if (getApps().length === 0) {
    firebaseApp = initializeApp(config);
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);

    // Initialize App Check only in browser
    if (typeof window !== 'undefined') {
      // Note: ReCaptcha Enterprise is recommended for production.
      // You must enable it in the Firebase Console and provide the site key.
      // For local development, you might want to use a debug token.
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaEnterpriseProvider(
          process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6Lc_dummy_site_key'
        ),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }
  return { firebaseApp, auth, firestore, storage };
}

export {
  initializeFirebase,
  FirebaseProvider,
  FirebaseClientProvider,
  useUser,
  useCollection,
  useDoc,
  useFirebaseApp,
  useAuth,
  useFirestore,
  useStorage,
};
