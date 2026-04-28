'use client';
import {
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

import { getFirebaseConfig } from './config';
import { useUser } from './auth/use-user';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';
import { useMemoFirebase } from './firestore/use-memo-firebase';
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

    // Configurar persistencia estricta de sesión
    setPersistence(auth, browserSessionPersistence).catch((err) => {
      console.error('Error setting auth persistence:', err);
    });

    // TODO: App Check temporalmente deshabilitado.
    // El backend de reCAPTCHA Enterprise no está configurado y genera errores 400.
    // Para rehabilitar: configurar el backend en Google Cloud Console y descomentar el bloque.
    //
    // if (typeof window !== 'undefined') {
    //   const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    //   if (process.env.NODE_ENV === 'development') {
    //     (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    //   }
    //   if (recaptchaKey && recaptchaKey !== '6Lc_dummy_site_key') {
    //     try {
    //       initializeAppCheck(firebaseApp, {
    //         provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
    //         isTokenAutoRefreshEnabled: true,
    //       });
    //     } catch (e) {
    //       console.warn('App Check initialization failed:', e);
    //     }
    //   }
    // }
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
  useMemoFirebase,
  useFirebaseApp,
  useAuth,
  useFirestore,
  useStorage,
};
