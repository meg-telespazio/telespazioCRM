'use client';
import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { Opportunity, Client } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { addDays } from 'date-fns';

const OPPORTUNITIES_COLLECTION = 'opportunities';

type OpportunityData = Omit<Opportunity, 'id' | 'publicId' | 'createdAt' | 'createdBy' | 'management' | 'assignedTo'>;

const cleanData = (data: any) => {
  const result: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      result[key] = data[key];
    }
  });
  return result;
};

export async function addOpportunity(
  firestore: Firestore,
  uid: string,
  opportunityData: OpportunityData
) {
  const clientRef = doc(firestore, 'clients', opportunityData.clientId);
  const clientSnap = await getDoc(clientRef);
  
  if (!clientSnap.exists()) throw new Error('Client not found');
  const clientData = clientSnap.data() as Client;

  const year = new Date().getFullYear();
  const counterRef = doc(firestore, 'counters', `opportunities_${year}`);
  const opportunityCollectionRef = collection(firestore, OPPORTUNITIES_COLLECTION);

  try {
    await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.data()?.count || 0;
      const newCount = currentCount + 1;
      
      const publicId = `OP-${year}-${String(newCount).padStart(6, '0')}`;
      const newOppRef = doc(opportunityCollectionRef);

      const data = {
        ...cleanData(opportunityData),
        publicId,
        createdBy: uid,
        createdAt: serverTimestamp(),
        management: clientData.management,
        assignedTo: clientData.assignedTo,
      };

      transaction.set(newOppRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
    });
  } catch (error) {
    console.error("Opportunity creation failed: ", error);
    throw error;
  }
}

export async function duplicateOpportunity(
  firestore: Firestore,
  uid: string,
  originalOpportunity: Opportunity
) {
  // Prepare duplication data
  const { id, publicId, createdAt, createdBy, management, assignedTo, ...originalData } = originalOpportunity;
  
  const duplicatedData: OpportunityData = {
    ...originalData,
    title: `${originalOpportunity.title} COPY`,
    stage: 'Prospecting', // Reset to initial stage
    probability: 10,
    closeDate: addDays(new Date(), 30), // Default to 30 days from now
    requestDate: new Date(),
    offerSentDate: undefined,
  };

  return addOpportunity(firestore, uid, duplicatedData);
}

export function updateOpportunity(
  firestore: Firestore,
  opportunityId: string,
  opportunityData: Partial<OpportunityData>
) {
  const opportunityRef = doc(firestore, OPPORTUNITIES_COLLECTION, opportunityId);
  const cleaned = cleanData(opportunityData);
  delete (cleaned as any).publicId;

  return updateDoc(opportunityRef, cleaned).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: opportunityRef.path,
      operation: 'update',
      requestResourceData: opportunityData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  });
}

export function deleteOpportunity(firestore: Firestore, opportunityId: string) {
  const opportunityRef = doc(firestore, OPPORTUNITIES_COLLECTION, opportunityId);
  deleteDoc(opportunityRef).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: opportunityRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
