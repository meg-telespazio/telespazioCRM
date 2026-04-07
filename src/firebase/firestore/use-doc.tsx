'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  onSnapshot,
  refEqual,
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

const convertTimestamps = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  if (data?.toDate && typeof data.toDate === 'function') return data.toDate();
  if (Array.isArray(data)) return data.map(convertTimestamps);
  
  const isPlainObject = Object.prototype.toString.call(data) === '[object Object]';
  if (isPlainObject) {
    const res: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        res[key] = convertTimestamps(data[key]);
      }
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

  // Estabilizar la referencia para evitar bucles infinitos
  const refStore = useRef<DocumentReference<DocumentData> | null>(null);
  const memoizedRef = useMemo(() => {
    if (!ref) {
      refStore.current = null;
      return null;
    }
    if (refStore.current && refEqual(ref, refStore.current)) {
      return refStore.current;
    }
    refStore.current = ref;
    return ref;
  }, [ref]);

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
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: memoizedRef.path, operation: 'get' }));
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedRef]);

  return { data, loading, error };
}
