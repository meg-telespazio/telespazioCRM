
'use client';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { SystemConfig } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const COLLECTION = 'systemConfig';
const CONFIG_ID = 'globals';

export async function getSystemConfig(firestore: Firestore): Promise<SystemConfig | null> {
  const docRef = doc(firestore, COLLECTION, CONFIG_ID);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    return {
      ...data,
      updatedAt: data.updatedAt?.toDate(),
    } as SystemConfig;
  }
  return null;
}

export async function updateSystemConfig(
  firestore: Firestore,
  uid: string,
  config: Partial<SystemConfig>
) {
  const docRef = doc(firestore, COLLECTION, CONFIG_ID);
  const data = {
    ...config,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, data, { merge: true });
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}
