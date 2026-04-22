'use client';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { QuoteRequest, Client, Opportunity, UserProfile } from '@/lib/types';
import { addClient } from './clients';
import { addOpportunity } from './opportunities';

export async function addQuoteRequest(
  firestore: Firestore,
  data: Omit<QuoteRequest, 'id' | 'createdAt' | 'status'>
) {
  const collectionRef = collection(firestore, 'quoteRequests');
  
  const fullData = {
    ...data,
    status: 'pending',
    isRead: false,
    createdAt: serverTimestamp(),
  };

  return addDoc(collectionRef, fullData);
}

export async function markQuoteRequestAsRead(firestore: Firestore, requestId: string) {
  const docRef = doc(firestore, 'quoteRequests', requestId);
  return updateDoc(docRef, { isRead: true });
}

export async function assignExecutiveToQuote(firestore: Firestore, requestId: string, executiveId: string) {
  const docRef = doc(firestore, 'quoteRequests', requestId);
  return updateDoc(docRef, { assignedTo: executiveId });
}

/**
 * Convierte una solicitud de cotización en un Cliente (Prospecto) y una Oportunidad (Prospección).
 */
export async function convertQuoteToDeal(
  firestore: Firestore,
  requestId: string,
  quote: QuoteRequest,
  assignedUser: UserProfile
) {
  if (!quote.assignedTo) throw new Error('La solicitud debe estar asignada antes de convertir.');

  // 1. Crear el Cliente (Prospecto)
  // Nota: addClient ya maneja la transacción para el publicId
  const clientData: any = {
    name: quote.companyName,
    legalName: quote.legalName,
    cuit: quote.taxId,
    taxIdType: quote.taxIdType,
    email: quote.contact.email,
    phone: quote.contact.phone,
    countryHQ: quote.country,
    status: 'active',
    type: 'prospect',
    sector: 'Otro', // Por defecto
    management: assignedUser.management,
    assignedTo: quote.assignedTo,
    notes: `Convertido de solicitud externa. CP: ${quote.address.postalCode}. Localidad: ${quote.address.city}.`,
  };

  // Necesitamos el ID del cliente creado. addClient es asíncrono y usa transacciones internas.
  // Para este MVP, crearemos una función que devuelva el ID o usaremos addDoc directamente si es necesario, 
  // pero mantendremos la consistencia con las librerías existentes.
  
  // Como addClient no devuelve el ID directamente en la firma actual (porque usa transacciones), 
  // vamos a usar una referencia de documento manual para poder encadenar.
  const clientsRef = collection(firestore, 'clients');
  const newClientDocRef = doc(clientsRef);
  const opportunitiesRef = collection(firestore, 'opportunities');
  const newOppDocRef = doc(opportunitiesRef);
  const quoteRef = doc(firestore, 'quoteRequests', requestId);
  
  // Usamos una transacción única para toda la operación de conversión
  try {
    await runTransaction(firestore, async (transaction) => {
      // 1. Obtener contadores
      const clientCounterRef = doc(firestore, 'counters', 'clients');
      const oppCounterRef = doc(firestore, 'counters', `opportunities_${new Date().getFullYear()}`);
      
      const clientCounterSnap = await transaction.get(clientCounterRef);
      const oppCounterSnap = await transaction.get(oppCounterRef);
      
      const newClientCount = (clientCounterSnap.data()?.count || 0) + 1;
      const newOppCount = (oppCounterSnap.data()?.count || 0) + 1;
      
      const clientPublicId = `CLI-${String(newClientCount).padStart(7, '0')}`;
      const oppPublicId = `OP-${new Date().getFullYear()}-${String(newOppCount).padStart(6, '0')}`;
      
      // 2. Crear Cliente
      transaction.set(newClientDocRef, {
        ...clientData,
        publicId: clientPublicId,
        createdBy: assignedUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // 3. Crear Oportunidad
      transaction.set(newOppDocRef, {
        title: `Pedido: ${quote.companyName} (${quote.quantity} serv.)`,
        clientId: newClientDocRef.id,
        value: 0, // Se definirá luego
        currency: 'USD',
        stage: 'Prospecting',
        probability: 10,
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 días
        contractMonths: 12,
        requestDate: new Date(),
        description: quote.description,
        publicId: oppPublicId,
        createdBy: assignedUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        management: assignedUser.management,
        assignedTo: quote.assignedTo!,
        risk: 'B-Medium',
        isPlanned: false,
        opportunityType: 'New Business',
        grossMarginPercentage: 0,
        grossMarginAmount: 0,
      });
      
      // 4. Actualizar contadores
      transaction.set(clientCounterRef, { count: newClientCount }, { merge: true });
      transaction.set(oppCounterRef, { count: newOppCount }, { merge: true });
      
      // 5. Marcar solicitud como convertida
      transaction.update(quoteRef, {
        status: 'converted',
        convertedClientId: newClientDocRef.id,
        convertedOpportunityId: newOppDocRef.id,
      });
    });
    
    return { clientId: newClientDocRef.id, opportunityId: newOppDocRef.id };
  } catch (e) {
    console.error("Conversion failed", e);
    throw e;
  }
}
