
'use client';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { SystemConfig, ExchangeRate } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const COLLECTION = 'systemConfig';
const CONFIG_ID = 'globals';
const HISTORY_COLLECTION = 'exchangeRateHistory';

export async function getSystemConfig(firestore: Firestore): Promise<SystemConfig | null> {
  const docRef = doc(firestore, COLLECTION, CONFIG_ID);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    return {
      ...data,
      lastRatesUpdate: data.lastRatesUpdate?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as SystemConfig;
  }
  return null;
}

export async function updateSystemConfig(
  firestore: Firestore,
  uid: string,
  config: Partial<SystemConfig>
) {
  const docRef = doc(firestore, COLLECTION, CONFIG_ID);
  const data = {
    ...config,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, data, { merge: true });
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export async function syncExchangeRates(firestore: Firestore, uid: string) {
  try {
    const response = await fetch('https://dolarapi.com/v1/cotizaciones');
    if (!response.ok) throw new Error('Failed to fetch from DolarAPI');
    
    const apiData = await response.json();
    
    // logic:
    // 1. Find USD rate to ARS (base for the API)
    const usdArs = apiData.find((d: any) => d.moneda === 'USD')?.venta || 1;
    
    // 2. Map all currencies to USD
    // Standard rule: 1 unit of [CURRENCY] = X [USD]
    // If the API says 1 EUR = 1600 ARS and 1 USD = 1400 ARS
    // Then 1 EUR = (1600 / 1400) USD = 1.14 USD
    const newRates: ExchangeRate[] = apiData.map((d: any) => {
      const rateToUsd = d.moneda === 'USD' ? 1 : (d.venta / usdArs);
      return {
        from: d.moneda,
        to: 'USD',
        rate: rateToUsd
      };
    });

    // Add ARS explicitly as it's the base of the API
    if (!newRates.find(r => r.from === 'ARS')) {
      newRates.push({
        from: 'ARS',
        to: 'USD',
        rate: 1 / usdArs
      });
    }

    // 3. Save to Global Config
    await updateSystemConfig(firestore, uid, {
      exchangeRates: newRates,
      lastRatesUpdate: new Date(),
    });

    // 4. Save to History
    const historyRef = collection(firestore, HISTORY_COLLECTION);
    await addDoc(historyRef, {
      date: serverTimestamp(),
      rates: newRates,
      createdBy: uid
    });

    return newRates;
  } catch (error) {
    console.error('Exchange rate sync failed:', error);
    throw error;
  }
}
