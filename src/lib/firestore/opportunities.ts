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
import type { Opportunity } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const OPPORTUNITIES_COLLECTION = 'opportunities';

type OpportunityData = Omit<Opportunity, 'id' | 'publicId' | 'createdAt' | 'createdBy'>;

export async function addOpportunity(
  firestore: Firestore,
  uid: string,
  opportunityData: OpportunityData
) {
  const year = new Date().getFullYear();
  const counterRef = doc(firestore, 'counters', `opportunities_${year}`);
  const opportunityCollectionRef = collection(firestore, OPPORTUNITIES_COLLECTION);

  try {
    await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      let newCount = 1;
      if (counterDoc.exists() && typeof counterDoc.data().count === 'number') {
        newCount = counterDoc.data().count + 1;
      }
      
      const publicId = `OP-${year}-${String(newCount).padStart(6, '0')}`;

      const newOppRef = doc(opportunityCollectionRef);

      const data = {
        ...opportunityData,
        publicId,
        createdBy: uid,
        createdAt: serverTimestamp(),
      };

      transaction.set(newOppRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
    });
  } catch (error) {
    console.error("Opportunity creation transaction failed: ", error);
     const permissionError = new FirestorePermissionError({
      path: `/${OPPORTUNITIES_COLLECTION} or /counters/opportunities_${year}`,
      operation: 'create',
      requestResourceData: opportunityData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw error;
  }
}

export function updateOpportunity(
  firestore: Firestore,
  opportunityId: string,
  opportunityData: Partial<OpportunityData>
) {
  const opportunityRef = doc(firestore, OPPORTUNITIES_COLLECTION, opportunityId);
  // publicId should not be editable
  const { publicId, ...updateData } = opportunityData as any;

  updateDoc(opportunityRef, updateData).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: opportunityRef.path,
      operation: 'update',
      requestResourceData: opportunityData,
    });
    errorEmitter.emit('permission-error', permissionError);
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
