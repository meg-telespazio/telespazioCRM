'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  onSnapshot,
  type DocumentReference,
  type DocumentData,
  type FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type UseDocReturn<T> = {
  data: T | null;
  loading: boolean;
  error: FirestoreError | null;
};

// Firestore timestamps need to be converted to JS Date objects.
// This function recursively checks for and converts timestamps.
const convertTimestamps = (data: any): any => {
    if (data?.toDate) {
      return data.toDate();
    }
    if (Array.isArray(data)) {
      return data.map(convertTimestamps);
    }
    if (typeof data === 'object' && data !== null) {
      const res: { [key: string]: any } = {};
      for (const key in data) {
        res[key] = convertTimestamps(data[key]);
      }
      return res;
    }
    return data;
  };

export function useDoc<T>(
  ref: DocumentReference<DocumentData> | null
): UseDocReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const memoizedRef = useMemo(() => ref, [ref]);

  useEffect(() => {
    if (!memoizedRef) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      memoizedRef,
      (doc) => {
        if (doc.exists()) {
          const docData = convertTimestamps(doc.data());
          setData({ id: doc.id, ...docData } as T);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        const permissionError = new FirestorePermissionError({
          path: memoizedRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);

        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedRef]);

  return { data, loading, error };
}
