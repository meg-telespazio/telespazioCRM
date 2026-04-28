import * as admin from 'firebase-admin';

const getServiceAccount = () => {
  const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (envServiceAccount) {
    try {
      return JSON.parse(envServiceAccount);
    } catch (e) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_JSON env var');
    }
  }
  // Fallback a archivo local (solo desarrollo)
  try {
    return require('../../service-account.json');
  } catch (e) {
    console.error('Service account file not found and no env var provided');
    return null;
  }
};

if (!admin.apps.length) {
  const serviceAccount = getServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
