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
import type { Opportunity } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const OPPORTUNITIES_COLLECTION = 'opportunities';

type OpportunityData = Omit<Opportunity, 'id' | 'createdAt' | 'createdBy'>;

export function addOpportunity(
  firestore: Firestore,
  uid: string,
  opportunityData: OpportunityData
) {
  const data = {
    ...opportunityData,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };

  addDoc(collection(firestore, OPPORTUNITIES_COLLECTION), data).catch(
    (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: `/${OPPORTUNITIES_COLLECTION}`,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  );
}

export function updateOpportunity(
  firestore: Firestore,
  opportunityId: string,
  opportunityData: Partial<OpportunityData>
) {
  const opportunityRef = doc(firestore, OPPORTUNITIES_COLLECTION, opportunityId);
  updateDoc(opportunityRef, opportunityData).catch((serverError) => {
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
