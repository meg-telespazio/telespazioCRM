
'use client';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  runTransaction,
  type Firestore,
  updateDoc,
} from 'firebase/firestore';
import type { Activity, ActivityFollowUp, Client } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const ACTIVITIES_COLLECTION = 'activities';
const FOLLOW_UPS_SUBCOLLECTION = 'followUps';

type ActivityData = Omit<Activity, 'id' | 'publicId' | 'createdAt' | 'updatedAt' | 'latestFollowUpContent' | 'latestFollowUpBy' | 'management' | 'assignedTo'>;
type FollowUpData = Omit<ActivityFollowUp, 'id' | 'activityId' | 'createdAt'>;

const cleanData = (data: any) => {
  const result: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      result[key] = data[key];
    }
  });
  return result;
};

export async function addActivity(
  firestore: Firestore,
  activityData: ActivityData
) {
  // Inherit security fields from client
  const clientRef = doc(firestore, 'clients', activityData.clientId);
  const clientSnap = await getDoc(clientRef);
  if (!clientSnap.exists()) throw new Error('Client not found');
  const clientData = clientSnap.data() as Client;

  const counterRef = doc(firestore, 'counters', 'activities');
  const activityCollectionRef = collection(firestore, ACTIVITIES_COLLECTION);

  try {
    await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      const currentCount = counterDoc.data()?.count;
      const newCount = (typeof currentCount === 'number' && Number.isInteger(currentCount) ? currentCount : 0) + 1;

      const publicId = `ACT-${String(newCount).padStart(8, '0')}`;
      
      const newActivityRef = doc(activityCollectionRef);
      
      const data = {
        ...cleanData(activityData),
        publicId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        latestFollowUpContent: null,
        latestFollowUpBy: null,
        management: clientData.management,
        assignedTo: clientData.assignedTo,
      };

      transaction.set(newActivityRef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
    });
  } catch (error) {
    console.error("Activity creation transaction failed: ", error);
    const permissionError = new FirestorePermissionError({
      path: `/${ACTIVITIES_COLLECTION} or /counters/activities`,
      operation: 'create',
      requestResourceData: activityData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw error;
  }
}


export function addFollowUp(
  firestore: Firestore,
  activityId: string,
  followUpData: FollowUpData
) {
  const activityRef = doc(firestore, ACTIVITIES_COLLECTION, activityId);
  const followUpCollectionRef = collection(
    activityRef,
    FOLLOW_UPS_SUBCOLLECTION
  );

  const data = {
    ...cleanData(followUpData),
    createdAt: serverTimestamp(),
  };

  const newFollowUpRef = doc(followUpCollectionRef);

  runTransaction(firestore, async (transaction) => {
    transaction.set(newFollowUpRef, data);
    transaction.update(activityRef, { 
      updatedAt: serverTimestamp(),
      latestFollowUpContent: followUpData.content,
      latestFollowUpBy: followUpData.createdBy,
    });
  }).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: activityRef.path,
      operation: 'update',
      requestResourceData: followUpData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
