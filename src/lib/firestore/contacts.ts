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
import type { Contact } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const CONTACTS_COLLECTION = 'contacts';

type ContactData = Omit<Contact, 'id' | 'publicId' | 'createdAt' | 'createdBy'>;

export async function addContact(
  firestore: Firestore,
  uid: string,
  contactData: ContactData
) {
  const counterRef = doc(firestore, 'counters', 'contacts');
  const contactCollectionRef = collection(firestore, CONTACTS_COLLECTION);

  try {
    await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let newCount = 1;
      if (counterDoc.exists() && typeof counterDoc.data().count === 'number') {
        newCount = counterDoc.data().count + 1;
      }

      const publicId = `CT-${String(newCount).padStart(7, '0')}`;
      
      const newContactRef = doc(contactCollectionRef);
      
      const data = {
        ...contactData,
        publicId,
        createdBy: uid,
        createdAt: serverTimestamp(),
      };

      transaction.set(newContactRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
    });
  } catch (error) {
    console.error("Contact creation transaction failed: ", error);
    const permissionError = new FirestorePermissionError({
      path: `/${CONTACTS_COLLECTION} or /counters/contacts`,
      operation: 'create',
      requestResourceData: contactData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw error;
  }
}

export function updateContact(
  firestore: Firestore,
  contactId: string,
  contactData: Partial<ContactData>
) {
  const contactRef = doc(firestore, CONTACTS_COLLECTION, contactId);
  updateDoc(contactRef, contactData).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: contactRef.path,
      operation: 'update',
      requestResourceData: contactData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function deleteContact(firestore: Firestore, contactId: string) {
  const contactRef = doc(firestore, CONTACTS_COLLECTION, contactId);
  deleteDoc(contactRef).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: contactRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
