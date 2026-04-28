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
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import type { Client, ManagementArea, UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { logAuditAction } from './audit';

const CLIENTS_COLLECTION = 'clients';

type ClientData = Omit<Client, 'id' | 'publicId' | 'createdAt' | 'updatedAt' | 'createdBy'>;

const cleanData = (data: any) => {
  const result: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
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
  const cleanIdValue = clientData.cuit;

  if (cleanIdValue && cleanIdValue !== '00000000000' && cleanIdValue !== '-') {
    const q = query(clientCollectionRef, where('cuit', '==', cleanIdValue));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error('This Tax ID is already registered.');
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
        updatedAt: serverTimestamp(),
      };

      transaction.set(newClientRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
      
      logAuditAction(firestore, {
        action: 'create',
        collection: CLIENTS_COLLECTION,
        docId: newClientRef.id,
        details: `Nuevo cliente: ${clientData.name} (${clientData.taxIdType}: ${clientData.cuit})`
      });
    });
  } catch (error) {
    console.error("Client creation transaction failed: ", error);
    if (error instanceof Error && error.message.includes('Tax ID')) {
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

/**
 * Reasigna un cliente y TODAS sus entidades relacionadas a un nuevo responsable.
 * Esto incluye contactos, locaciones, oportunidades, contratos, POs, servicios y equipos.
 */
export async function reassignClient(
  firestore: Firestore,
  clientId: string,
  newOwnerId: string,
  newManagement: ManagementArea
) {
  const batch = writeBatch(firestore);
  const updatedAt = serverTimestamp();
  const updateFields = { assignedTo: newOwnerId, management: newManagement, updatedAt };

  // 1. Cliente
  batch.update(doc(firestore, 'clients', clientId), updateFields);

  // 2. Entidades vinculadas directamente por clientId
  const directEntities = ['contacts', 'locations', 'opportunities', 'activities', 'contracts'];
  
  for (const coll of directEntities) {
    const q = query(collection(firestore, coll), where('clientId', '==', clientId));
    const snap = await getDocs(q);
    snap.forEach(d => batch.update(d.ref, updateFields));
  }

  // 3. Entidades vinculadas jerárquicamente (Contrato -> PO -> Service -> Equipment)
  const contractsQuery = query(collection(firestore, 'contracts'), where('clientId', '==', clientId));
  const contractsSnap = await getDocs(contractsQuery);
  
  for (const contractDoc of contractsSnap.docs) {
    const contractId = contractDoc.id;
    
    // Purchase Orders
    const posQuery = query(collection(firestore, 'purchaseOrders'), where('contractId', '==', contractId));
    const posSnap = await getDocs(posQuery);
    
    for (const poDoc of posSnap.docs) {
      const poId = poDoc.id;
      batch.update(poDoc.ref, updateFields);

      // Services
      const servicesQuery = query(collection(firestore, 'services'), where('poId', '==', poId));
      const servicesSnap = await getDocs(servicesQuery);
      
      for (const serviceDoc of servicesSnap.docs) {
        const serviceId = serviceDoc.id;
        batch.update(serviceDoc.ref, updateFields);

        // Equipment (linked to service)
        const equipmentQuery = query(collection(firestore, 'equipment'), where('currentServiceId', '==', serviceId));
        const equipmentSnap = await getDocs(equipmentQuery);
        equipmentSnap.forEach(eqDoc => batch.update(eqDoc.ref, updateFields));
      }
    }
  }

  try {
    await batch.commit();
    logAuditAction(firestore, {
      action: 'update',
      collection: CLIENTS_COLLECTION,
      docId: clientId,
      details: `Reasignación masiva a ${newOwnerId} (${newManagement})`
    });
  } catch (error: any) {
    console.error("Cascade reassignment failed:", error);
    throw error;
  }
}

export async function updateClient(
  firestore: Firestore,
  clientId: string,
  clientData: Partial<ClientData>
) {
  const clientCollectionRef = collection(firestore, CLIENTS_COLLECTION);
  
  if (clientData.cuit && clientData.cuit !== '00000000000' && clientData.cuit !== '-') {
      const q = query(clientCollectionRef, where("cuit", "==", clientData.cuit));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
          const docExists = snapshot.docs.some(doc => doc.id !== clientId);
          if (docExists) {
              throw new Error("This Tax ID is already registered.");
          }
      }
  }

  const clientRef = doc(firestore, CLIENTS_COLLECTION, clientId);
  const data = {
    ...cleanData(clientData),
    updatedAt: serverTimestamp(),
  };
  try {
    await updateDoc(clientRef, data);
    logAuditAction(firestore, {
      action: 'update',
      collection: CLIENTS_COLLECTION,
      docId: clientId,
      details: `Campos actualizados: ${Object.keys(data).join(', ')}`
    });
  } catch(serverError) {
    const permissionError = new FirestorePermissionError({
      path: clientRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  }
}

export function deleteClient(firestore: Firestore, clientId: string) {
  const clientRef = doc(firestore, CLIENTS_COLLECTION, clientId);
  deleteDoc(clientRef).then(() => {
    logAuditAction(firestore, {
      action: 'delete',
      collection: CLIENTS_COLLECTION,
      docId: clientId
    });
  }).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: clientRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
