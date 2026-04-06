
'use client';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { Location, Client } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const LOCATIONS_COLLECTION = 'locations';

type LocationData = Omit<Location, 'id' | 'publicId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'management' | 'assignedTo'>;

export async function addLocation(
  firestore: Firestore,
  uid: string,
  locationData: LocationData
) {
  // Inherit security fields from client
  const clientRef = doc(firestore, 'clients', locationData.clientId);
  const clientSnap = await getDoc(clientRef);
  if (!clientSnap.exists()) throw new Error('Client not found');
  const clientData = clientSnap.data() as Client;

  const counterRef = doc(firestore, 'counters', 'locations');
  const locationCollectionRef = collection(firestore, LOCATIONS_COLLECTION);

  try {
    await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      const currentCount = counterDoc.data()?.count;
      const newCount = (typeof currentCount === 'number' && Number.isInteger(currentCount) ? currentCount : 0) + 1;

      const publicId = `LOC-${String(newCount).padStart(8, '0')}`;
      
      const newLocationRef = doc(locationCollectionRef);
      
      const data = {
        ...locationData,
        publicId,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        management: clientData.management,
        assignedTo: clientData.assignedTo,
      };

      transaction.set(newLocationRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
    });
  } catch (error) {
    console.error("Location creation transaction failed: ", error);
    const permissionError = new FirestorePermissionError({
      path: `/${LOCATIONS_COLLECTION} or /counters/locations`,
      operation: 'create',
      requestResourceData: locationData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw error;
  }
}

export function updateLocation(
  firestore: Firestore,
  locationId: string,
  locationData: Partial<LocationData>
) {
  const locationRef = doc(firestore, LOCATIONS_COLLECTION, locationId);
  const data = {
    ...locationData,
    updatedAt: serverTimestamp(),
  };
  return updateDoc(locationRef, data).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: locationRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  });
}

export function deleteLocation(firestore: Firestore, locationId: string) {
  const locationRef = doc(firestore, LOCATIONS_COLLECTION, locationId);
  deleteDoc(locationRef).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: locationRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
