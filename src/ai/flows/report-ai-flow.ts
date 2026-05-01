'use server';
/**
 * @fileOverview Agente AI de reportes rediseñado con Genkit Tools.
 * El LLM usa tools para consultar datos con seguridad aplicada en código.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  setToolContext,
  getAvailableModulesTool,
  getSchemaInfoTool,
  queryCollectionTool,
  aggregateCollectionTool,
} from '@/ai/tools/report-tools';
import type { PermissionsMatrix, UserRole } from '@/lib/types';

// --- Schemas ---

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ReportAIInputSchema = z.object({
  messages: z.array(MessageSchema),
  userRole: z.string(),
  userId: z.string(),
  userManagement: z.string(),
  permissionsMatrix: z.any(),
  collectionsData: z.any().describe('Datos de colecciones cargados en el frontend'),
});

const ReportAIOutputSchema = z.object({
  type: z.enum(['answer', 'unauthorized', 'off_topic', 'clarification']).describe('Tipo de respuesta'),
  text: z.string().describe('Respuesta conversacional para el usuario'),
  data: z.array(z.any()).optional().describe('Datos tabulares para mostrar en tabla'),
  columns: z.array(z.string()).optional().describe('Columnas de la tabla de datos'),
  isQuantitative: z.boolean().optional().describe('Si es un resultado numérico/agregado'),
  summary: z.string().optional().describe('Resumen de la interacción para el historial'),
});

export type ReportAIInput = z.infer<typeof ReportAIInputSchema>;
export type ReportAIOutput = z.infer<typeof ReportAIOutputSchema>;

// --- System prompt ---

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

6. FORMATO:
   - Sé conciso y profesional.
   - Para resultados numéricos, formatea con separadores de miles.
   - Para tablas, retorna los datos en el campo "data" con las columnas en "columns".
   - Al final de cada respuesta con datos, pregunta "¿Necesitas algo más?".

7. HISTORIAL:
   - Siempre genera un "summary" breve de lo que hiciste.`;

// --- Flow principal ---

const reportAgentFlow = ai.defineFlow(
  {
    name: 'reportAgentFlow',
    inputSchema: ReportAIInputSchema,
    outputSchema: ReportAIOutputSchema,
  },
  async (input) => {
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
        output: { schema: ReportAIOutputSchema },
      });

      const output = response.output;

      if (output) {
        return output;
      }

      // Fallback: si no hay output estructurado, construir desde el texto
      return {
        type: 'answer' as const,
        text: response.text || 'No pude procesar tu consulta. ¿Podrías reformularla?',
        summary: 'Respuesta generada sin estructura',
      };
    } catch (error: any) {
      console.error('Report agent error:', error);
      return {
        type: 'answer' as const,
        text: 'Ocurrió un error procesando tu consulta. Por favor intenta de nuevo.',
        summary: `Error: ${error.message}`,
      };
    }
  }
);

export async function processReportQuery(input: ReportAIInput): Promise<ReportAIOutput> {
  return reportAgentFlow(input);
}