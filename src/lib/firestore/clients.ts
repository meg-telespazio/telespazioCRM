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
import type { Client } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const CLIENTS_COLLECTION = 'clients';

type ClientData = Omit<Client, 'id' | 'publicId' | 'createdAt' | 'createdBy'>;

const cleanData = (data: any) => {
  const result: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
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
  const cleanCuitValue = clientData.cuit;

  if (cleanCuitValue && cleanCuitValue !== '00000000000') {
    const q = query(clientCollectionRef, where('cuit', '==', cleanCuitValue));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error('This CUIT is already registered.');
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
      };

      transaction.set(newClientRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
    });
  } catch (error) {
    console.error("Client creation transaction failed: ", error);
    if (error instanceof Error && error.message.includes('CUIT')) {
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
  
  if (clientData.cuit && clientData.cuit !== '00000000000') {
      const q = query(clientCollectionRef, where("cuit", "==", clientData.cuit));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
          const docExists = snapshot.docs.some(doc => doc.id !== clientId);
          if (docExists) {
              throw new Error("This CUIT is already registered.");
          }
      }
  }

  const clientRef = doc(firestore, CLIENTS_COLLECTION, clientId);
  const data = cleanData(clientData);
  try {
    await updateDoc(clientRef, data);
  } catch(serverError) {
    const permissionError = new FirestorePermissionError({
      path: clientRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError; // rethrow after emitting
  }
}

export function deleteClient(firestore: Firestore, clientId: string) {
  const clientRef = doc(firestore, CLIENTS_COLLECTION, clientId);
  deleteDoc(clientRef).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: clientRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}