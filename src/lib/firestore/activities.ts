'use client';
import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { Activity, ActivityFollowUp } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const ACTIVITIES_COLLECTION = 'activities';
const FOLLOW_UPS_SUBCOLLECTION = 'followUps';

type ActivityData = Omit<Activity, 'id' | 'publicId' | 'createdAt'>;
type FollowUpData = Omit<ActivityFollowUp, 'id' | 'activityId' | 'createdAt'>;

export async function addActivity(
  firestore: Firestore,
  activityData: ActivityData
) {
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
        ...activityData,
        publicId,
        createdAt: serverTimestamp(),
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
  const followUpCollectionRef = collection(
    firestore,
    ACTIVITIES_COLLECTION,
    activityId,
    FOLLOW_UPS_SUBCOLLECTION
  );

  const data = {
    ...followUpData,
    createdAt: serverTimestamp(),
  };

  addDoc(followUpCollectionRef, data).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: followUpCollectionRef.path,
      operation: 'create',
      requestResourceData: followUpData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
