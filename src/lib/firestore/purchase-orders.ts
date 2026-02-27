'use client';
import {
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { PurchaseOrder } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const COLLECTION = 'purchaseOrders';

export async function addPurchaseOrder(
  firestore: Firestore,
  uid: string,
  data: Omit<PurchaseOrder, 'createdBy' | 'createdAt'>
) {
  const docRef = doc(firestore, COLLECTION, data.id);
  const fullData = {
    ...data,
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

export function updatePurchaseOrder(
  firestore: Firestore,
  poId: string,
  data: Partial<PurchaseOrder>
) {
  const docRef = doc(firestore, COLLECTION, poId);
  updateDoc(docRef, data).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: data,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function deletePurchaseOrder(firestore: Firestore, poId: string) {
  const docRef = doc(firestore, COLLECTION, poId);
  deleteDoc(docRef).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}