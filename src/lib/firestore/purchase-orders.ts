
'use client';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { PurchaseOrder, Contract } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const COLLECTION = 'purchaseOrders';

const cleanData = (data: any) => {
  const result: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      result[key] = data[key];
    }
  });
  return result;
};

export async function addPurchaseOrder(
  firestore: Firestore,
  uid: string,
  data: Omit<PurchaseOrder, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'management' | 'assignedTo'>
) {
  // Inherit security fields from contract
  const contractRef = doc(firestore, 'contracts', data.contractId);
  const contractSnap = await getDoc(contractRef);
  if (!contractSnap.exists()) throw new Error('Contract not found');
  const contractData = contractSnap.data() as Contract;

  const collectionRef = collection(firestore, COLLECTION);
  const cleaned = cleanData(data);
  const fullData = {
    ...cleaned,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    management: contractData.management,
    assignedTo: contractData.assignedTo,
  };

  try {
    return await addDoc(collectionRef, fullData);
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: collectionRef.path,
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
  data: Partial<Omit<PurchaseOrder, 'id'>>
) {
  const docRef = doc(firestore, COLLECTION, poId);
  const cleaned = {
    ...cleanData(data),
    updatedAt: serverTimestamp(),
  };
  updateDoc(docRef, cleaned).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: cleaned,
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
