
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
  writeBatch,
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
 * Recupera el email de un usuario por su UID.
 */
async function getUserEmail(firestore: Firestore, uid: string): Promise<string | null> {
  if (!uid) return null;
  const userDoc = await getDoc(doc(firestore, 'users', uid));
  return userDoc.exists() ? userDoc.data().email : null;
}

/**
 * Prepara y envía notificaciones (Email y Alerta Interna).
 */
async function sendSONotification(firestore: Firestore, so: any, action: 'creada' | 'modificada' | 'cerrada') {
  const eeccEmail = await getUserEmail(firestore, so.eeccId);
  const pmEmail = so.pmAssignedId ? await getUserEmail(firestore, so.pmAssignedId) : null;
  
  const recipients = [eeccEmail, pmEmail].filter(Boolean) as string[];
  if (recipients.length === 0) return;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const soLink = `${appUrl}/service-orders/${so.id}`;

  const subject = `[T-Track] Service Order ${so.publicId} - ${action.toUpperCase()}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #EC1C24;">Notificación de Service Order</h2>
      <p>La Service Order <strong>${so.publicId}</strong> (${so.clientName}) ha sido <strong>${action}</strong>.</p>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Tipo:</strong> ${so.type}</p>
        <p style="margin: 0;"><strong>Estado Actual:</strong> ${so.status}</p>
      </div>
      <a href="${soLink}" style="display: inline-block; background: #EC1C24; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver en T-Track</a>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 10px; color: #999;">Telespazio Argentina - T-Track CRM. Este es un mensaje automático.</p>
    </div>
  `;

  try {
    // 1. Grabamos en la colección /mail para la extensión "Trigger Email"
    await addDoc(collection(firestore, 'mail'), {
      to: recipients,
      message: {
        subject,
        html,
      },
      createdAt: serverTimestamp(),
    });

    // 2. Grabamos en una colección de notificaciones internas para el Dashboard (opcional)
    recipients.forEach(async (email) => {
      await addDoc(collection(firestore, 'notifications'), {
        toEmail: email,
        title: subject,
        message: `La SO ${so.publicId} ha sido ${action}.`,
        link: soLink,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    console.log(`[NOTIFICACIÓN] Enviada a ${recipients.join(', ')} por SO ${so.publicId}`);
  } catch (e) {
    console.warn('Fallo al registrar notificación:', e);
  }
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
      
      return { id: newSORef.id, publicId, ...data };
    });

    await sendSONotification(firestore, result, 'creada');
    
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
    
    const snap = await getDoc(soRef);
    if (snap.exists()) {
      await sendSONotification(firestore, { id: soId, ...snap.data() }, 'modificada');
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

export async function closeServiceOrder(
  firestore: Firestore,
  soId: string,
  user: UserProfile,
  closingData: { comments: string; date: Date }
) {
  const soRef = doc(firestore, SO_COLLECTION, soId);
  
  // Create closing log
  await addSOComment(firestore, soId, user, `ORDEN CERRADA: ${closingData.comments}`, 'Cerrada');

  await updateDoc(soRef, {
    status: 'Cerrada',
    'dates.serviceActivationComplete': closingData.date,
    updatedAt: serverTimestamp(),
  });

  const snap = await getDoc(soRef);
  if (snap.exists()) {
    await sendSONotification(firestore, { id: soId, ...snap.data() }, 'cerrada');
  }
}

export async function deleteServiceOrder(firestore: Firestore, soId: string) {
  const soRef = doc(firestore, SO_COLLECTION, soId);
  const itemsRef = collection(firestore, SO_COLLECTION, soId, 'items');
  const commentsRef = collection(firestore, SO_COLLECTION, soId, 'comments');

  const itemsSnap = await getDocs(itemsRef);
  const commentsSnap = await getDocs(commentsRef);

  const batch = writeBatch(firestore);
  itemsSnap.forEach(d => batch.delete(d.ref));
  commentsSnap.forEach(d => batch.delete(d.ref));
  batch.delete(soRef);

  try {
    await batch.commit();
  } catch (error: any) {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: soRef.path,
      operation: 'delete',
    }));
    throw error;
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
  statusChange?: ServiceOrder['status']
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
      await updateDoc(doc(firestore, SO_COLLECTION, soId), { status: statusChange });
    }
  } catch (error: any) {
    throw error;
  }
}
