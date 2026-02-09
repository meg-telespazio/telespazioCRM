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
import type { Report } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const REPORTS_COLLECTION = 'reports';

// Note: This is a sub-collection under users
const getReportsCollection = (firestore: Firestore, uid: string) => collection(firestore, 'users', uid, REPORTS_COLLECTION);

type ReportData = Omit<Report, 'id' | 'createdAt' | 'createdBy'>;

export function addReport(
  firestore: Firestore,
  uid: string,
  reportData: ReportData
) {
  const reportsCollectionRef = getReportsCollection(firestore, uid);
  const data = {
    ...reportData,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };

  // Firestore doesn't like `undefined` values from the UI state
  const cleanData = JSON.parse(JSON.stringify(data));

  return addDoc(reportsCollectionRef, cleanData).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: `users/${uid}/${REPORTS_COLLECTION}`,
      operation: 'create',
      requestResourceData: cleanData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  });
}

export function updateReport(
  firestore: Firestore,
  uid: string,
  reportId: string,
  reportData: Partial<ReportData>
) {
  const reportRef = doc(firestore, 'users', uid, REPORTS_COLLECTION, reportId);
  const cleanData = JSON.parse(JSON.stringify(reportData));
  
  return updateDoc(reportRef, cleanData).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: reportRef.path,
      operation: 'update',
      requestResourceData: cleanData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  });
}

export function deleteReport(firestore: Firestore, uid: string, reportId: string) {
  const reportRef = doc(firestore, 'users', uid, REPORTS_COLLECTION, reportId);
  return deleteDoc(reportRef).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: reportRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  });
}
