
'use client';
import {
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { Equipment } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const COLLECTION = 'equipment';

export async function addEquipment(
  firestore: Firestore,
  uid: string,
  data: Omit<Equipment, 'createdBy' | 'createdAt'>
) {
  const docRef = doc(firestore, COLLECTION, data.id);
  const fullData = {
    ...data,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, fullData);
  } catch (serverError) {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'create',
      requestResourceData: fullData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  }
}

export function updateEquipment(
  firestore: Firestore,
  id: string,
  data: Partial<Equipment>
) {
  const docRef = doc(firestore, COLLECTION, id);
  updateDoc(docRef, data).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function deleteEquipment(firestore: Firestore, id: string) {
  const docRef = doc(firestore, COLLECTION, id);
  deleteDoc(docRef).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
