
'use client';
import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { Contract, Client } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { logAuditAction } from './audit';

const CONTRACTS_COLLECTION = 'contracts';

type ContractData = Omit<Contract, 'id' | 'publicId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'management' | 'assignedTo'>;

const cleanData = (data: any) => {
  const result: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      result[key] = data[key];
    }
  });
  return result;
};

export async function addContract(
  firestore: Firestore,
  uid: string,
  contractData: ContractData
) {
  const clientRef = doc(firestore, 'clients', contractData.clientId);
  const clientSnap = await getDoc(clientRef);
  if (!clientSnap.exists()) throw new Error('Client not found');
  const clientData = clientSnap.data() as Client;

  const year = new Date().getFullYear();
  const counterRef = doc(firestore, 'counters', `contracts_${year}`);
  const contractCollectionRef = collection(firestore, CONTRACTS_COLLECTION);

  try {
    await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.data()?.count || 0;
      const newCount = currentCount + 1;
      
      const publicId = `CON-${year}-${String(newCount).padStart(7, '0')}`;
      const newContractRef = doc(contractCollectionRef);

      const data = {
        ...cleanData(contractData),
        publicId,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        management: clientData.management,
        assignedTo: clientData.assignedTo,
      };

      transaction.set(newContractRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
      
      logAuditAction(firestore, {
        action: 'create',
        collection: CONTRACTS_COLLECTION,
        docId: newContractRef.id,
        details: `Nuevo contrato: ${publicId} para ${clientData.name}`
      });
    });
  } catch (error: any) {
    console.error("Contract creation failed: ", error);
    throw error;
  }
}

export function updateContract(
  firestore: Firestore,
  contractId: string,
  contractData: Partial<ContractData>
) {
  const contractRef = doc(firestore, CONTRACTS_COLLECTION, contractId);
  const data = {
    ...cleanData(contractData),
    updatedAt: serverTimestamp(),
  };
  
  return updateDoc(contractRef, data).then(() => {
    logAuditAction(firestore, {
      action: 'update',
      collection: CONTRACTS_COLLECTION,
      docId: contractId,
      details: `Campos actualizados: ${Object.keys(data).join(', ')}`
    });
  }).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: contractRef.path,
      operation: 'update',
      requestResourceData: data,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  });
}

export function deleteContract(firestore: Firestore, contractId: string) {
  const contractRef = doc(firestore, CONTRACTS_COLLECTION, contractId);
  deleteDoc(contractRef).then(() => {
    logAuditAction(firestore, {
      action: 'delete',
      collection: CONTRACTS_COLLECTION,
      docId: contractId
    });
  }).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: contractRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}
