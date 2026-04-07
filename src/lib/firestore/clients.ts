
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
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import type { Client, ManagementArea } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { logAuditAction } from './audit';

const CLIENTS_COLLECTION = 'clients';

type ClientData = Omit<Client, 'id' | 'publicId' | 'createdAt' | 'updatedAt' | 'createdBy'>;

const cleanData = (data: any) => {
  const result: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      result[key] = data[key];
    }
  });
  return result;
};

export async function addClient(
  firestore: Firestore,
  uid: string,
  clientData: ClientData
) {
  const clientCollectionRef = collection(firestore, CLIENTS_COLLECTION);
  const cleanIdValue = clientData.cuit;

  // Check for duplicates within the same type or globally if preferred
  // For safety across regions, we check global string value
  if (cleanIdValue && cleanIdValue !== '00000000000' && cleanIdValue !== '-') {
    const q = query(clientCollectionRef, where('cuit', '==', cleanIdValue));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error('This Tax ID is already registered.');
    }
  }
  
  const counterRef = doc(firestore, 'counters', 'clients');

  try {
    await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      const currentCount = counterDoc.data()?.count;
      const newCount = (typeof currentCount === 'number' && Number.isInteger(currentCount) ? currentCount : 0) + 1;

      const publicId = `CLI-${String(newCount).padStart(7, '0')}`;
      
      const newClientRef = doc(clientCollectionRef);
      
      const data = {
        ...cleanData(clientData),
        publicId,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      transaction.set(newClientRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
      
      logAuditAction(firestore, {
        action: 'create',
        collection: CLIENTS_COLLECTION,
        docId: newClientRef.id,
        details: `Nuevo cliente: ${clientData.name} (${clientData.taxIdType}: ${clientData.cuit})`
      });
    });
  } catch (error) {
    console.error("Client creation transaction failed: ", error);
    if (error instanceof Error && error.message.includes('Tax ID')) {
      throw error;
    }
    const permissionError = new FirestorePermissionError({
      path: `/${CLIENTS_COLLECTION} or /counters/clients`,
      operation: 'create',
      requestResourceData: clientData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw error;
  }
}

export async function updateClient(
  firestore: Firestore,
  clientId: string,
  clientData: Partial<ClientData>
) {
  const clientCollectionRef = collection(firestore, CLIENTS_COLLECTION);
  
  if (clientData.cuit && clientData.cuit !== '00000000000' && clientData.cuit !== '-') {
      const q = query(clientCollectionRef, where("cuit", "==", clientData.cuit));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
          const docExists = snapshot.docs.some(doc => doc.id !== clientId);
          if (docExists) {
              throw new Error("This Tax ID is already registered.");
          }
      }
  }

  const clientRef = doc(firestore, CLIENTS_COLLECTION, clientId);
  const data = {
    ...cleanData(clientData),
    updatedAt: serverTimestamp(),
  };
  try {
    await updateDoc(clientRef, data);
    logAuditAction(firestore, {
      action: 'update',
      collection: CLIENTS_COLLECTION,
      docId: clientId,
      details: `Campos actualizados: ${Object.keys(data).join(', ')}`
    });
  } catch(serverError) {
    const permissionError = new FirestorePermissionError({
      path: clientRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  }
}

export function deleteClient(firestore: Firestore, clientId: string) {
  const clientRef = doc(firestore, CLIENTS_COLLECTION, clientId);
  deleteDoc(clientRef).then(() => {
    logAuditAction(firestore, {
      action: 'delete',
      collection: CLIENTS_COLLECTION,
      docId: clientId
    });
  }).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: clientRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
