
'use client';
import {
  collection,
  setDoc,
  doc,
  serverTimestamp,
  type Firestore,
  writeBatch,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import type { Holding } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const HOLDINGS_COLLECTION = 'holdings';
const CLIENTS_COLLECTION = 'clients';

// We use the holding name as ID for easier lookup from string fields,
// sanitized to avoid issues with special characters.
const sanitizeId = (name: string) => encodeURIComponent(name.trim().toLowerCase());

export async function upsertHolding(
  firestore: Firestore,
  uid: string,
  oldName: string | null,
  newName: string,
  description: string = ''
) {
  const newId = sanitizeId(newName);
  const holdingRef = doc(firestore, HOLDINGS_COLLECTION, newId);
  
  const batch = writeBatch(firestore);

  // 1. Create/Update the Holding record
  batch.set(holdingRef, {
    name: newName.trim(),
    description,
    createdBy: uid,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(), // Will be ignored if exists because of merge logic if we used it, but here we set.
  }, { merge: true });

  // 2. If name changed, update all clients
  if (oldName && oldName !== newName) {
    const clientsQuery = query(collection(firestore, CLIENTS_COLLECTION), where('holding', '==', oldName));
    const snapshot = await getDocs(clientsQuery);
    
    snapshot.forEach(clientDoc => {
      batch.update(clientDoc.ref, { holding: newName.trim() });
    });

    // Delete old holding doc if it's different
    const oldId = sanitizeId(oldName);
    if (oldId !== newId) {
      batch.delete(doc(firestore, HOLDINGS_COLLECTION, oldId));
    }
  }

  try {
    await batch.commit();
  } catch (serverError: any) {
    const permissionError = new FirestorePermissionError({
      path: `/${HOLDINGS_COLLECTION}/${newId}`,
      operation: 'update',
      requestResourceData: { name: newName, description },
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  }
}
