
'use client';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Firestore,
  writeBatch,
} from 'firebase/firestore';
import type { Service, Equipment } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const SERVICES_COLLECTION = 'services';
const EQUIPMENT_COLLECTION = 'equipment';

export async function addService(
  firestore: Firestore,
  uid: string,
  serviceData: Omit<Service, 'id' | 'createdAt' | 'createdBy'>
) {
  const collectionRef = collection(firestore, SERVICES_COLLECTION);
  const data = {
    ...serviceData,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };

  try {
    return await addDoc(collectionRef, data);
  } catch (serverError) {
    const permissionError = new FirestorePermissionError({
      path: `/${SERVICES_COLLECTION}`,
      operation: 'create',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  }
}

export async function importServices(
  firestore: Firestore,
  uid: string,
  services: any[],
  poId: string
) {
  const batch = writeBatch(firestore);
  
  for (const s of services) {
    const serviceRef = doc(collection(firestore, SERVICES_COLLECTION));
    const equipmentId = s.equipmentId; // This is the user_terminal_id (UUID)
    
    // Create/Update Equipment
    const equipmentRef = doc(firestore, EQUIPMENT_COLLECTION, equipmentId);
    batch.set(equipmentRef, {
      id: equipmentId,
      userTerminal: s.userTerminal || equipmentId,
      physicalStatus: 'Activa',
      currentServiceId: serviceRef.id,
      createdBy: uid,
      createdAt: serverTimestamp(),
    }, { merge: true });

    // Create Service
    batch.set(serviceRef, {
      ...s,
      poId,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (serverError) {
    errorEmitter.emit('permission-error', new Error('Batch import failed'));
    throw serverError;
  }
}

export function updateService(
  firestore: Firestore,
  id: string,
  data: Partial<Service>
) {
  const docRef = doc(firestore, SERVICES_COLLECTION, id);
  updateDoc(docRef, data).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function deleteService(firestore: Firestore, id: string) {
  const docRef = doc(firestore, SERVICES_COLLECTION, id);
  deleteDoc(docRef).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
