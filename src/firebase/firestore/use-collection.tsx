
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  onSnapshot,
  type Query,
  type DocumentData,
  type FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type UseCollectionReturn<T> = {
  data: T[] | null;
  loading: boolean;
  error: FirestoreError | null;
};

const convertTimestamps = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  if (data?.toDate && typeof data.toDate === 'function') return data.toDate();
  
  // Optimization: only recurse if it's a plain object or array
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

export function useCollection<T>(
  query: Query<DocumentData> | null
): UseCollectionReturn<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  
  const memoizedQuery = useMemo(() => query, [query]);

  useEffect(() => {
    if (!memoizedQuery) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      memoizedQuery,
      (snapshot) => {
        const result: T[] = [];
        snapshot.forEach((doc) => {
          const docData = convertTimestamps(doc.data());
          result.push({ id: doc.id, ...docData } as T);
        });
        setData(result);
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        const path = (memoizedQuery as any)._query?.path?.segments?.join('/');
        if (path) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation: 'list' }));
        }
        setError(err);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery]);

  return { data, loading, error };
}
