
'use client';
import { collection, addDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Registra una acción en el log de auditoría del sistema.
 */
export async function logAuditAction(
  firestore: Firestore,
  params: {
    action: 'create' | 'update' | 'delete';
    collection: string;
    docId: string;
    details?: string;
  }
) {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) return;

  const auditRef = collection(firestore, 'auditLogs');
  
  const logData = {
    userId: user.uid,
    userEmail: user.email,
    action: params.action,
    collection: params.collection,
    docId: params.docId,
    details: params.details || '',
    timestamp: serverTimestamp(),
  };

  try {
    // Nota: No usamos await aquí para no bloquear la UI, 
    // pero manejamos el error de forma silenciosa para el usuario final.
    addDoc(auditRef, logData);
  } catch (e) {
    console.warn('Fallo al registrar log de auditoría:', e);
  }
}
