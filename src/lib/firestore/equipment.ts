
'use client';
import {
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
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
  data: Omit<Equipment, 'createdBy' | 'createdAt' | 'updatedAt'>
) {
  const docRef = doc(firestore, COLLECTION, data.id);
  const cleaned = cleanData(data);
  const fullData = {
    ...cleaned,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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

export async function updateEquipment(
  firestore: Firestore,
  originalId: string,
  data: Partial<Equipment>
) {
  const cleaned = {
    ...cleanData(data),
    updatedAt: serverTimestamp(),
  };
  const newId = cleaned.id;

  // Si el ID ha cambiado, necesitamos crear un nuevo documento y borrar el viejo
  if (newId && newId !== originalId) {
    try {
      const oldDocRef = doc(firestore, COLLECTION, originalId);
      const oldSnap = await getDoc(oldDocRef);
      
      if (oldSnap.exists()) {
        const oldData = oldSnap.data();
        const newDocRef = doc(firestore, COLLECTION, newId);
        
        // Creamos el nuevo con los datos actualizados
        await setDoc(newDocRef, {
          ...oldData,
          ...cleaned,
          id: newId
        });
        
        // Borramos el viejo
        await deleteDoc(oldDocRef);
      }
    } catch (serverError: any) {
      console.error("Migration error:", serverError);
      throw serverError;
    }
  } else {
    // ID no cambió, actualización normal
    const docRef = doc(firestore, COLLECTION, originalId);
    updateDoc(docRef, cleaned).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: cleaned,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
  }
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
