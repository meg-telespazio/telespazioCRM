
'use client';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { Addendum } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const CONTRACTS_COLLECTION = 'contracts';
const ADDENDUMS_SUBCOLLECTION = 'addendums';

type AddendumData = Omit<Addendum, 'id' | 'createdAt' | 'createdBy' | 'contractId'>;

export async function addAddendum(
  firestore: Firestore,
  contractId: string,
  uid: string,
  addendumData: AddendumData
) {
  const addendumCollectionRef = collection(firestore, CONTRACTS_COLLECTION, contractId, ADDENDUMS_SUBCOLLECTION);
  
  const data = {
    ...addendumData,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };

  try {
    return await addDoc(addendumCollectionRef, data);
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: addendumCollectionRef.path,
        operation: 'create',
        requestResourceData: data,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

export function deleteAddendum(firestore: Firestore, contractId: string, addendumId: string) {
  const addendumRef = doc(firestore, CONTRACTS_COLLECTION, contractId, ADDENDUMS_SUBCOLLECTION, addendumId);
  deleteDoc(addendumRef).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: addendumRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}
