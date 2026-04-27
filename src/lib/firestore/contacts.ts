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
import type { Contact, Client } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const CONTACTS_COLLECTION = 'contacts';

type ContactData = Omit<Contact, 'id' | 'publicId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'management' | 'assignedTo'>;

const cleanData = (data: any) => {
  const result: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      result[key] = data[key];
    }
  });
  return result;
};

export async function addContact(
  firestore: Firestore,
  uid: string,
  contactData: ContactData
) {
  const clientRef = doc(firestore, 'clients', contactData.clientId);
  const counterRef = doc(firestore, 'counters', 'contacts');
  const contactCollectionRef = collection(firestore, CONTACTS_COLLECTION);

  try {
    await runTransaction(firestore, async (transaction) => {
      // 1. Obtener datos del cliente para heredar seguridad
      const clientSnap = await transaction.get(clientRef);
      if (!clientSnap.exists()) {
        throw new Error('El cliente asociado no existe.');
      }
      const clientData = clientSnap.data() as Client;

      // 2. Obtener y actualizar contador
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.data()?.count || 0;
      const newCount = currentCount + 1;

      const publicId = `CT-${String(newCount).padStart(7, '0')}`;
      const newContactRef = doc(contactCollectionRef);
      
      // 3. Construir objeto final con herencia de management y assignedTo
      const data = {
        ...cleanData(contactData),
        publicId,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        management: clientData.management,
        assignedTo: clientData.assignedTo,
      };

      transaction.set(newContactRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
    });
  } catch (error: any) {
    console.error("Contact creation transaction failed: ", error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: `/${CONTACTS_COLLECTION} or /counters/contacts`,
        operation: 'create',
        requestResourceData: contactData,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export function updateContact(
  firestore: Firestore,
  contactId: string,
  contactData: Partial<ContactData>
) {
  const contactRef = doc(firestore, CONTACTS_COLLECTION, contactId);
  const data = {
    ...cleanData(contactData),
    updatedAt: serverTimestamp(),
  };
  updateDoc(contactRef, data).catch((serverError) => {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: contactRef.path,
        operation: 'update',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  });
}

export function deleteContact(firestore: Firestore, contactId: string) {
  const contactRef = doc(firestore, CONTACTS_COLLECTION, contactId);
  deleteDoc(contactRef).catch((serverError) => {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: contactRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  });
}
