'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Flow 1: Obtener ID Tributario (CUIT) basado en Razón Social
export const fetchTaxIdFromLegalName = ai.defineFlow(
  {
    name: 'fetchTaxIdFromLegalName',
    inputSchema: z.object({ legalName: z.string(), countryUrl: z.string().optional() }),
    outputSchema: z.object({ taxId: z.string().nullable(), error: z.string().optional() }),
  },
  async ({ legalName }) => {
    // Sanitize input to prevent prompt injection
    const safeLegalName = legalName.replace(/["\n\r]/g, '').substring(0, 200);

    try {
      const { text } = await ai.generate({
        prompt: `Busca en internet (si fuera necesario o en tu conocimiento) cuál es el número de identificación tributaria (como el CUIT en Argentina o RUT/RUC) para la empresa con razón social: "${safeLegalName}". Devuelve ÚNICAMENTE los números, sin guiones ni espacios. Si no estás seguro o no lo encuentras, responde exactamente la palabra NULL.`,
      });
      
      const cleanText = text.trim();
      if (cleanText === 'NULL' || cleanText.includes('NULL')) {
        return { taxId: null, error: 'No se encontró el ID tributario' };
      }
      
      return { taxId: cleanText.replace(/\D/g, '') }; // Extract just digits
    } catch (error: any) {
      console.error(error);
      return { taxId: null, error: error.message };
    }
  }
);

// Flow 2: Obtener Razón Social basado en ID Tributario (CUIT)
export const fetchLegalNameFromTaxId = ai.defineFlow(
  {
    name: 'fetchLegalNameFromTaxId',
    inputSchema: z.object({ taxId: z.string(), type: z.string().optional() }),
    outputSchema: z.object({ legalName: z.string().nullable(), error: z.string().optional() }),
  },
  async ({ taxId }) => {
    // Sanitize input to prevent prompt injection
    const safeTaxId = taxId.replace(/["\n\r]/g, '').substring(0, 50);

    try {
      const { text } = await ai.generate({
        prompt: `Busca utilizando el número de identificación tributaria (CUIT, RUT, etc): "${safeTaxId}". Devuelve ÚNICAMENTE la razón social o nombre legal completo de la empresa. Si no lo encuentras, responde exactamente la palabra NULL.`,
      });
      
      const cleanText = text.trim();
      if (cleanText === 'NULL' || cleanText.includes('NULL')) {
        return { legalName: null, error: 'No se encontró la razón social' };
      }
      
      return { legalName: cleanText };
    } catch (error: any) {
      console.error(error);
      return { legalName: null, error: error.message };
    }
  }
);
