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
import type { Contact } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const CONTACTS_COLLECTION = 'contacts';

type ContactData = Omit<Contact, 'id' | 'createdAt' | 'createdBy'>;

export function addContact(
  firestore: Firestore,
  uid: string,
  contactData: ContactData
) {
  const data = {
    ...contactData,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };

  addDoc(collection(firestore, CONTACTS_COLLECTION), data).catch(
    (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: `/${CONTACTS_COLLECTION}`,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  );
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
