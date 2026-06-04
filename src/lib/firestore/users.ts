'use client';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  doc, 
  type Firestore,
  serverTimestamp
} from 'firebase/firestore';
import type { ManagementArea } from '@/lib/types';
import { logAuditAction } from './audit';

/**
 * Reasigna todos los registros vinculados a un usuario y luego elimina su perfil de Firestore.
 */
export async function deleteUserAndReassignData(
  firestore: Firestore,
  deletedUid: string,
  newOwnerId: string,
  newManagement: ManagementArea
) {
  const batch = writeBatch(firestore);
  const updatedAt = serverTimestamp();
  const updateFields = { assignedTo: newOwnerId, management: newManagement, updatedAt };

  // Listado de colecciones que dependen del campo assignedTo para seguridad y gestión
  const collectionsToUpdate = [
    'clients', 
    'contacts', 
    'locations', 
    'opportunities', 
    'activities', 
    'contracts',
    'purchaseOrders',
    'services',
    'equipment',
    'service_orders'
  ];

  // 1. Iterar por cada colección y reasignar documentos
  for (const collName of collectionsToUpdate) {
    const q = query(collection(firestore, collName), where('assignedTo', '==', deletedUid));
    const snap = await getDocs(q);
    snap.forEach(d => {
      batch.update(d.ref, updateFields);
    });
  }

  // 2. Manejo especial para Service Orders (donde puede ser EECC o PM)
  const soQueryPm = query(collection(firestore, 'service_orders'), where('pmAssignedId', '==', deletedUid));
  const soSnapPm = await getDocs(soQueryPm);
  soSnapPm.forEach(d => {
    batch.update(d.ref, { pmAssignedId: newOwnerId, updatedAt });
  });

  // 3. Eliminar el documento del usuario en Firestore
  batch.delete(doc(firestore, 'users', deletedUid));

  try {
    await batch.commit();
    
    logAuditAction(firestore, {
      action: 'delete',
      collection: 'users',
      docId: deletedUid,
      details: `Usuario eliminado. Datos traspasados a ${newOwnerId} (${newManagement})`
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Critical: User deletion/reassignment failed:", error);
    throw error;
  }
}
