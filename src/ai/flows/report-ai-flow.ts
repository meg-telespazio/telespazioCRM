'use server';
/**
 * @fileOverview Agente AI de reportes rediseñado con Genkit Tools.
 * El LLM usa tools para consultar datos con seguridad aplicada en código.
 */

import { ai } from '@/ai/genkit';
import {
  setToolContext,
  getAvailableModulesTool,
  getSchemaInfoTool,
  queryCollectionTool,
  aggregateCollectionTool,
} from '@/ai/tools/report-tools';
import type { PermissionsMatrix, UserRole } from '@/lib/types';

export type ReportAIInput = {
  messages: { role: 'user' | 'model'; content: string }[];
  userRole: string;
  userId: string;
  userManagement: string;
  permissionsMatrix: any;
  collectionsData: any;
};

export type ReportAIOutput = {
  type: 'answer' | 'unauthorized' | 'off_topic' | 'clarification';
  text: string;
  data?: any[];
  columns?: string[];
  isQuantitative?: boolean;
  summary?: string;
};

const SYSTEM_PROMPT = `Eres el Analista de Datos del CRM T-Track de Telespazio. Tu nombre es T-Track AI.

REGLAS DE OPERACIÓN OBLIGATORIAS:

1. SCOPE: Solo respondes preguntas relacionadas con reportes y análisis de datos del CRM (clientes, contactos, oportunidades, contratos, órdenes de compra, servicios, equipos, actividades, ubicaciones y catálogo de productos). Si te preguntan sobre cualquier otro tema, responde con type "off_topic" y explica amablemente que solo puedes ayudar con análisis de datos del CRM.

2. SEGURIDAD: 
   - Antes de consultar cualquier dato, usa la tool "getAvailableModules" para verificar qué módulos puede ver el usuario.
   - Si el usuario pide datos de un módulo al que no tiene acceso, responde con type "unauthorized" y dile que esa información no está disponible para su perfil.
   - NUNCA intentes acceder a datos sin verificar permisos primero.

3. COMPRENSIÓN:
   - Si la pregunta es ambigua o no queda claro qué datos quiere el usuario, responde con type "clarification" y pide más detalles.
   - Sugiere opciones concretas: "¿Te refieres a clientes activos? ¿De qué sector?"
   
4. CONSULTAS:
   - Usa "getSchemaInfo" para entender la estructura de datos antes de consultar.
   - Usa "queryCollection" para obtener registros detallados.
   - Usa "aggregateCollection" para cálculos (sumas, promedios, conteos).
   - Siempre pregunta si el usuario quiere ver más detalle o exportar.

5. MAPEO DE TÉRMINOS (el usuario habla en español, los datos están en inglés):
   - "Banca", "Banco", "Financiero" → sector "Finance"
   - "Petróleo", "Gas", "Oil & Gas", "Energía" → sector "Energy"
   - "Minería", "Litio" → sector "Mining"
   - "Agro", "Campo" → sector "Agriculture"
   - "Ganado", "Won" → stage "Won"
   - "Perdido" → stage "Lost"
   - "Prospección" → stage "Prospecting"
   - "Negociación" → stage "Negotiation"
   - "Propuesta" → stage "Proposal"

6. FORMATO OBLIGATORIO DE RESPUESTA:
   Para que el frontend pueda procesar tu respuesta correctamente, DEBES retornar ÚNICAMENTE un objeto JSON válido que siga la siguiente estructura. No incluyas explicaciones antes o después del JSON.

   {
     "type": "answer",
     "text": "Aquí la respuesta conversacional para el usuario explicando los resultados de manera resumida y amigable",
     "data": [ { "id": "1", "name": "Ejemplo" } ],
     "columns": [ "id", "name" ],
     "isQuantitative": false,
     "summary": "Resumen breve para el historial"
   }

   - Si el resultado es un número o conteo, pon isQuantitative en true.
   - No uses comillas dentro del texto que puedan romper el JSON.
`;

export async function processReportQuery(input: ReportAIInput): Promise<ReportAIOutput> {
  // Inyectar contexto para las tools
  setToolContext({
    userRole: input.userRole as UserRole,
    userId: input.userId,
    userManagement: input.userManagement,
    permissionsMatrix: input.permissionsMatrix as PermissionsMatrix,
    collectionsData: input.collectionsData || {},
  });

  // Construir historial de mensajes
  const chatMessages = input.messages.map(m => ({
    role: m.role as 'user' | 'model',
    content: [{ text: m.content }],
  }));

  try {
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: SYSTEM_PROMPT,
      messages: chatMessages,
      tools: [
        getAvailableModulesTool,
        getSchemaInfoTool,
        queryCollectionTool,
        aggregateCollectionTool,
      ],
    });

    let jsonStr = response.text || '';
    const match = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) || jsonStr.match(/```\s*([\s\S]*?)\s*```/);
    if (match) {
      jsonStr = match[1];
    }

    try {
      const output = JSON.parse(jsonStr.trim());
      return {
        type: output.type || 'answer',
        text: output.text || 'Consulta procesada.',
        data: output.data,
        columns: output.columns,
        isQuantitative: output.isQuantitative,
        summary: output.summary,
      };
    } catch (parseError) {
      console.warn('Error parsing JSON:', parseError, response.text);
      return {
        type: 'answer',
        text: response.text || 'No pude procesar tu consulta. ¿Podrías reformularla?',
        summary: 'Respuesta generada en texto plano'
      };
    }
  } catch (error: any) {
    console.error('Report agent error:', error);
    return {
      type: 'answer',
      text: 'Ocurrió un error procesando tu consulta. Por favor intenta de nuevo.',
      summary: `Error: ${error.message}`,
    };
  }
}