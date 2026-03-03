
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
import type { Service } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const SERVICES_COLLECTION = 'services';
const EQUIPMENT_COLLECTION = 'equipment';

const cleanData = (data: any) => {
  const result: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      result[key] = data[key];
    }
  });
  return result;
};

export async function addService(
  firestore: Firestore,
  uid: string,
  serviceData: Omit<Service, 'id' | 'createdAt' | 'createdBy'>
) {
  const collectionRef = collection(firestore, SERVICES_COLLECTION);
  const cleaned = cleanData(serviceData);
  const data = {
    ...cleaned,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };

  try {
    return await addDoc(collectionRef, data);
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: `/${SERVICES_COLLECTION}`,
        operation: 'create',
        requestResourceData: data,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
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
    const cleanedService = cleanData(s);
    batch.set(serviceRef, {
      ...cleanedService,
      poId,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new Error('Batch import failed: Permission Denied'));
    }
    throw serverError;
  }
}

export async function bulkUpdateServices(
  firestore: Firestore,
  serviceIds: string[],
  updates: Partial<Service>
) {
  const batch = writeBatch(firestore);
  const cleanedUpdates = cleanData(updates);
  
  serviceIds.forEach(id => {
    const serviceRef = doc(firestore, SERVICES_COLLECTION, id);
    batch.update(serviceRef, cleanedUpdates);
  });

  try {
    await batch.commit();
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new Error('Bulk update failed: Permission Denied'));
    }
    throw serverError;
  }
}

export function updateService(
  firestore: Firestore,
  id: string,
  data: Partial<Service>
) {
  const docRef = doc(firestore, SERVICES_COLLECTION, id);
  const cleaned = cleanData(data);
  updateDoc(docRef, cleaned).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: cleaned,
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function deleteService(firestore: Firestore, id: string) {
  const docRef = doc(firestore, SERVICES_COLLECTION, id);
  deleteDoc(docRef).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext);
    errorEmitter.emit('permission-error', permissionError);
  });
}
