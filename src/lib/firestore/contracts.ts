'use client';
import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { Contract } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const CONTRACTS_COLLECTION = 'contracts';

type ContractData = Omit<Contract, 'id' | 'publicId' | 'createdAt' | 'createdBy'>;

export async function addContract(
  firestore: Firestore,
  uid: string,
  contractData: ContractData
) {
  const year = new Date().getFullYear();
  const counterRef = doc(firestore, 'counters', `contracts_${year}`);
  const contractCollectionRef = collection(firestore, CONTRACTS_COLLECTION);

  try {
    await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      const currentCount = counterDoc.data()?.count;
      const newCount = (typeof currentCount === 'number' && Number.isInteger(currentCount) ? currentCount : 0) + 1;
      
      const publicId = `CON-${year}-${String(newCount).padStart(7, '0')}`;

      const newContractRef = doc(contractCollectionRef);

      const data = {
        ...contractData,
        publicId,
        createdBy: uid,
        createdAt: serverTimestamp(),
      };

      transaction.set(newContractRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
    });
  } catch (error: any) {
    console.error("Contract creation transaction failed: ", error);
    
    // Si es un error de permisos, emitimos el error contextual para el overlay de desarrollo
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: `/${CONTRACTS_COLLECTION} or /counters/contracts_${year}`,
        operation: 'create',
        requestResourceData: {
          ...contractData,
          createdBy: uid,
        },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
    
    throw error;
  }
}

export function updateContract(
  firestore: Firestore,
  contractId: string,
  contractData: Partial<ContractData>
) {
  const contractRef = doc(firestore, CONTRACTS_COLLECTION, contractId);
  
  return updateDoc(contractRef, contractData).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: contractRef.path,
      operation: 'update',
      requestResourceData: contractData,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  });
}

export function deleteContract(firestore: Firestore, contractId: string) {
  const contractRef = doc(firestore, CONTRACTS_COLLECTION, contractId);
  deleteDoc(contractRef).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: contractRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}