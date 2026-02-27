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
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const COLLECTION = 'equipment';

const cleanData = (data: any) => {
  const result: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      result[key] = data[key];
    }
  });
  return result;
};

export async function addEquipment(
  firestore: Firestore,
  uid: string,
  data: Omit<Equipment, 'createdBy' | 'createdAt'>
) {
  const docRef = doc(firestore, COLLECTION, data.id);
  const cleaned = cleanData(data);
  const fullData = {
    ...cleaned,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, fullData);
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: fullData,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

export function updateEquipment(
  firestore: Firestore,
  id: string,
  data: Partial<Equipment>
) {
  const docRef = doc(firestore, COLLECTION, id);
  const cleaned = cleanData(data);
  updateDoc(docRef, cleaned).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: cleaned,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function deleteEquipment(firestore: Firestore, id: string) {
  const docRef = doc(firestore, COLLECTION, id);
  deleteDoc(docRef).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}