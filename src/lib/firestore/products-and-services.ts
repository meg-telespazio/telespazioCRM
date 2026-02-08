'use client';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { ProductOrService } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const PS_COLLECTION = 'productsAndServices';

type PSData = Omit<ProductOrService, 'id' | 'publicId' | 'createdAt' | 'createdBy'>;

export async function addProductOrService(
  firestore: Firestore,
  uid: string,
  itemData: PSData
) {
  const counterId = itemData.type === 'product' ? 'products' : 'services';
  const counterRef = doc(firestore, 'counters', counterId);
  const itemCollectionRef = collection(firestore, PS_COLLECTION);
  const prefix = itemData.type === 'product' ? 'C-PO' : 'C-SRV';

  try {
    await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      const currentCount = counterDoc.data()?.count;
      const newCount = (typeof currentCount === 'number' && Number.isInteger(currentCount) ? currentCount : 0) + 1;

      const publicId = `${prefix}-${String(newCount).padStart(8, '0')}`;
      
      const newItemRef = doc(itemCollectionRef);
      
      const data = {
        ...itemData,
        publicId,
        createdBy: uid,
        createdAt: serverTimestamp(),
      };

      transaction.set(newItemRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
    });
  } catch (error) {
    console.error("P&S Item creation transaction failed: ", error);
    const permissionError = new FirestorePermissionError({
      path: `/${PS_COLLECTION} or /counters/${counterId}`,
      operation: 'create',
      requestResourceData: itemData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw error;
  }
}

export function updateProductOrService(
  firestore: Firestore,
  itemId: string,
  itemData: Partial<PSData>
) {
  const itemRef = doc(firestore, PS_COLLECTION, itemId);
  return updateDoc(itemRef, itemData).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: itemRef.path,
      operation: 'update',
      requestResourceData: itemData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  });
}

export function deleteProductOrService(firestore: Firestore, itemId: string) {
  const itemRef = doc(firestore, PS_COLLECTION, itemId);
  deleteDoc(itemRef).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: itemRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
