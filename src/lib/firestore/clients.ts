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
import type { Client } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const CLIENTS_COLLECTION = 'clients';

type ClientData = Omit<Client, 'id' | 'publicId' | 'createdAt' | 'createdBy'>;

export async function addClient(
  firestore: Firestore,
  uid: string,
  clientData: ClientData
) {
  const counterRef = doc(firestore, 'counters', 'clients');
  const clientCollectionRef = collection(firestore, CLIENTS_COLLECTION);

  try {
    await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let newCount = 1;
      if (counterDoc.exists()) {
        const currentCount = counterDoc.data().count;
        if (typeof currentCount === 'number') {
          newCount = currentCount + 1;
        }
      }

      const publicId = `CLI-${String(newCount).padStart(7, '0')}`;
      
      const newClientRef = doc(clientCollectionRef);
      
      const data = {
        ...clientData,
        publicId,
        createdBy: uid,
        createdAt: serverTimestamp(),
      };

      transaction.set(newClientRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
    });
  } catch (error) {
    console.error("Client creation transaction failed: ", error);
    const permissionError = new FirestorePermissionError({
      path: `/${CLIENTS_COLLECTION} or /counters/clients`,
      operation: 'create',
      requestResourceData: clientData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw error;
  }
}

export function updateClient(
  firestore: Firestore,
  clientId: string,
  clientData: Partial<ClientData>
) {
  const clientRef = doc(firestore, CLIENTS_COLLECTION, clientId);
  updateDoc(clientRef, clientData).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: clientRef.path,
      operation: 'update',
      requestResourceData: clientData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
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
