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

  return addDoc(reportsCollectionRef, data).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: `users/${uid}/${REPORTS_COLLECTION}`,
      operation: 'create',
      requestResourceData: data,
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
  return updateDoc(reportRef, reportData).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: reportRef.path,
      operation: 'update',
      requestResourceData: reportData,
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
