'use client';
import {
  collection,
  addDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { QuoteRequest } from '@/lib/types';

export async function addQuoteRequest(
  firestore: Firestore,
  data: Omit<QuoteRequest, 'id' | 'createdAt' | 'status'>
) {
  const collectionRef = collection(firestore, 'quoteRequests');
  
  const fullData = {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  return addDoc(collectionRef, fullData);
}
