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
 * Maneja lotes (batches) de hasta 400 operaciones para no exceder los límites de Firestore (500 ops por lote).
 */
export async function deleteUserAndReassignData(
  firestore: Firestore,
  deletedUid: string,
  newOwnerId: string,
  newManagement: ManagementArea
) {
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

  let currentBatch = writeBatch(firestore);
  let opCount = 0;

  const commitIfNeeded = async () => {
    opCount++;
    if (opCount >= 400) {
      await currentBatch.commit();
      currentBatch = writeBatch(firestore);
      opCount = 0;
    }
  };

  try {
    // 1. Iterar por cada colección y reasignar documentos
    for (const collName of collectionsToUpdate) {
      const q = query(collection(firestore, collName), where('assignedTo', '==', deletedUid));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        currentBatch.update(d.ref, updateFields);
        await commitIfNeeded();
      }
    }

    // 2. Manejo especial para Service Orders (donde puede ser PM asignado)
    const soQueryPm = query(collection(firestore, 'service_orders'), where('pmAssignedId', '==', deletedUid));
    const soSnapPm = await getDocs(soQueryPm);
    for (const d of soSnapPm.docs) {
      currentBatch.update(d.ref, { pmAssignedId: newOwnerId, updatedAt });
      await commitIfNeeded();
    }

    // 3. Eliminar el documento del usuario en Firestore
    currentBatch.delete(doc(firestore, 'users', deletedUid));
    await currentBatch.commit();

    // 4. Registro de auditoría
    try {
      await logAuditAction(firestore, {
        action: 'delete',
        collection: 'users',
        docId: deletedUid,
        details: `Usuario eliminado. Datos traspasados a ${newOwnerId} (${newManagement})`
      });
    } catch (auditErr) {
      console.warn("Audit logging failed:", auditErr);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Critical: User deletion/reassignment failed:", error);
    throw error;
  }
}
