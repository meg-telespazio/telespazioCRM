'use client';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { Client } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const CLIENTS_COLLECTION = 'clients';

type ClientData = Omit<Client, 'id' | 'createdAt' | 'createdBy'>;

export function addClient(
  firestore: Firestore,
  uid: string,
  clientData: ClientData
) {
  const data = {
    ...clientData,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };

  addDoc(collection(firestore, CLIENTS_COLLECTION), data).catch(
    (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: `/${CLIENTS_COLLECTION}`,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  );
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
