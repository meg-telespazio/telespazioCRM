
'use client';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  runTransaction,
  type Firestore,
  query,
  where,
  setDoc,
} from 'firebase/firestore';
import type { ServiceOrder, ServiceOrderItem, ServiceOrderComment, UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const SO_COLLECTION = 'service_orders';

const cleanData = (data: any) => {
  const result: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      result[key] = data[key];
    }
  });
  return result;
};

/**
 * Mock function to represent sending an email.
 * In production, this would trigger a Cloud Function or call an external service (SendGrid, Resend, etc.)
 */
async function sendSONotificationEmail(so: any, action: 'created' | 'modified') {
  console.log(`[EMAIL MOCK] Notification to EECC and PM: Service Order ${so.publicId} has been ${action}.`);
  console.log(`[EMAIL MOCK] Link: /service-orders/${so.id}`);
  // Lógica real aquí dispararía un evento o una Cloud Function
}

export async function addServiceOrder(
  firestore: Firestore,
  uid: string,
  soData: Omit<ServiceOrder, 'id' | 'publicId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'itemsCount'>
) {
  const year = new Date().getFullYear();
  const counterRef = doc(firestore, 'counters', `service_orders_${year}`);
  const soCollectionRef = collection(firestore, SO_COLLECTION);

  try {
    const result = await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.data()?.count || 0;
      const newCount = currentCount + 1;
      
      const publicId = `SO-${year}-${String(newCount).padStart(7, '0')}`;
      const newSORef = doc(soCollectionRef);

      const data = {
        ...cleanData(soData),
        publicId,
        itemsCount: 0,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      transaction.set(newSORef, data);
      transaction.set(counterRef, { count: newCount }, { merge: true });
      
      return { id: newSORef.id, publicId };
    });

    // Enviar correo tras crear exitosamente
    await sendSONotificationEmail(result, 'created');
    
    return result.id;
  } catch (error: any) {
    console.error("SO creation failed: ", error);
    throw error;
  }
}

export async function updateServiceOrder(
  firestore: Firestore,
  soId: string,
  data: Partial<ServiceOrder>
) {
  const soRef = doc(firestore, SO_COLLECTION, soId);
  const cleaned = cleanData(data);
  cleaned.updatedAt = serverTimestamp();

  try {
    await updateDoc(soRef, cleaned);
    
    // Obtenemos los datos actuales para el mock de email
    const snap = await getDoc(soRef);
    if (snap.exists()) {
      await sendSONotificationEmail({ id: soId, ...snap.data() }, 'modified');
    }
  } catch (serverError: any) {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: soRef.path,
      operation: 'update',
      requestResourceData: cleaned,
    }));
    throw serverError;
  }
}

export async function addSOItem(
  firestore: Firestore,
  soId: string,
  itemData: Omit<ServiceOrderItem, 'id' | 'isClosed' | 'serviceOrderId'>
) {
  const itemsRef = collection(firestore, SO_COLLECTION, soId, 'items');
  const soRef = doc(firestore, SO_COLLECTION, soId);

  const data = {
    ...cleanData(itemData),
    serviceOrderId: soId,
    isClosed: false,
  };

  try {
    await runTransaction(firestore, async (transaction) => {
      const soDoc = await transaction.get(soRef);
      const currentCount = soDoc.data()?.itemsCount || 0;
      
      const newItemRef = doc(itemsRef);
      transaction.set(newItemRef, data);
      transaction.update(soRef, { 
        itemsCount: currentCount + 1,
        updatedAt: serverTimestamp()
      });
    });
  } catch (error: any) {
    throw error;
  }
}

export async function updateSOItem(
  firestore: Firestore,
  soId: string,
  itemId: string,
  data: Partial<ServiceOrderItem>
) {
  const itemRef = doc(firestore, SO_COLLECTION, soId, 'items', itemId);
  const cleaned = cleanData(data);

  // Business logic: isClosed is true if PM provides final IDs
  if (cleaned.serviceIdFinal && cleaned.activationDate) {
    cleaned.isClosed = true;
  }

  try {
    await updateDoc(itemRef, cleaned);
  } catch (error: any) {
    throw error;
  }
}

export async function deleteSOItem(firestore: Firestore, soId: string, itemId: string) {
  const itemRef = doc(firestore, SO_COLLECTION, soId, 'items', itemId);
  const soRef = doc(firestore, SO_COLLECTION, soId);

  try {
    await runTransaction(firestore, async (transaction) => {
      const soDoc = await transaction.get(soRef);
      const currentCount = soDoc.data()?.itemsCount || 0;
      
      transaction.delete(itemRef);
      transaction.update(soRef, { 
        itemsCount: Math.max(0, currentCount - 1),
        updatedAt: serverTimestamp()
      });
    });
  } catch (error: any) {
    throw error;
  }
}

export async function addSOComment(
  firestore: Firestore,
  soId: string,
  user: UserProfile,
  text: string,
  statusChange?: ServiceOrder.status
) {
  const commentsRef = collection(firestore, SO_COLLECTION, soId, 'comments');
  const data = {
    userId: user.uid,
    userName: user.displayName,
    text,
    timestamp: serverTimestamp(),
    statusChange: statusChange || null,
  };

  try {
    await addDoc(commentsRef, data);
    if (statusChange) {
      await updateServiceOrder(firestore, soId, { status: statusChange });
    }
  } catch (error: any) {
    throw error;
  }
}
