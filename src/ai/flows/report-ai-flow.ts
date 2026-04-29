'use server';
/**
 * @fileOverview AI Flow robusto para reportes con validación de seguridad y lógica cuantitativa estricta.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ReportConfigSchema = z.object({
  primaryDataSource: z.enum(['clients', 'contacts', 'opportunities', 'productsAndServices', 'contracts', 'purchaseOrders', 'services', 'equipment', 'activities', 'locations']),
  fields: z.array(z.string()).describe('List of fields to show, format: "collection.field"'),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['contains', 'equals', 'not_equals', 'gt', 'lt', 'gte', 'lte', 'is', 'is_not', 'is_not_empty']),
    value: z.any(),
  })),
  sorting: z.array(z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']),
  })),
  groupBy: z.string().optional().describe('Field to group by if aggregations are used'),
  aggregations: z.array(z.object({
    field: z.string(),
    type: z.enum(['sum', 'avg', 'count']),
  })).optional(),
});

const ReportAIInputSchema = z.object({
  messages: z.array(MessageSchema),
  schemaContext: z.string(),
  userRole: z.string(),
  userManagement: z.string(),
  permissionsMatrix: z.any(), // Recibe la matriz de roles de systemConfig/globals
});

const ReportAIOutputSchema = z.object({
  type: z.enum(['question', 'config', 'unauthorized', 'greeting']),
  text: z.string().describe('Respuesta conversacional para el usuario.'),
  config: ReportConfigSchema.optional(),
  summary: z.string().optional().describe('Breve resumen de la interacción actual para el historial.'),
});

export type ReportAIInput = z.infer<typeof ReportAIInputSchema>;
export type ReportAIOutput = z.infer<typeof ReportAIOutputSchema>;

export async function processReportQuery(input: ReportAIInput): Promise<ReportAIOutput> {
  return reportAIFlow(input);
}

const prompt = ai.definePrompt({
  name: 'reportAIPrompt',
  input: { schema: ReportAIInputSchema },
  output: { schema: ReportAIOutputSchema },
  prompt: `Eres el Analista de Datos Inteligente del CRM T-Track de Telespazio.

DATOS DEL USUARIO:
- Rol: {{{userRole}}}
- Gerencia: {{{userManagement}}}
- Matriz de Permisos: {{{permissionsMatrix}}}

CONTEXTO DE LA BASE DE DATOS:
{{{schemaContext}}}

REGLAS CRÍTICAS DE OPERACIÓN (SIN EXCEPCIÓN):
1. VALIDACIÓN DE ACCESO: Antes de procesar, revisa si el rol del usuario tiene permiso "view" para el módulo solicitado en la matriz. Si no tiene acceso, responde con type: "unauthorized" y el texto: "Lo siento, según mi configuración no tengo acceso a esa información para tu perfil."

2. LÓGICA CUANTITATIVA (PRIORIDAD ALTA): Si la pregunta es sobre CANTIDADES, TOTALES, SUMAS o PROMEDIOS (ej: "¿Cuántos clientes tengo?", "¿Cuál es el MRR total?", "¿Cuántos negocios ganamos?"):
   - DEBES usar 'aggregations' en el objeto config.
   - NO devuelvas un listado de campos detallado (el campo 'fields' debe ser mínimo).
   - En el campo 'text', responde solo con el enunciado del resultado y pregunta: "¿Quieres ver el detalle de estos registros?".
   - Ejemplo: Si preguntan cuantos clientes, usa aggregation: { field: "clients.name", type: "count" }.

3. FILTROS DE SEGURIDAD AUTOMÁTICOS: 
   - Si el rol es 'ejecutivo', asume siempre un filtro automático donde 'assignedTo' es el ID del usuario.
   - Siempre usa el operador 'contains' para textos para evitar fallos por mayúsculas o acentos.

4. INTERACCIÓN: 
   - Siempre sé amable y profesional.
   - Al final de cada respuesta con datos, pregunta: "¿Necesitas ayuda con algo más?".
   - Si el usuario se despide o no pide nada más, responde con type: "greeting" y un saludo cordial.

5. HISTORIAL: Genera siempre un 'summary' de lo que hiciste en esta interacción para guardarlo en la base.

MAPPING DE SECTORES:
- "Banca" -> "Finance"
- "Petroleo/Gas" -> "Energy"

MENSAJES ANTERIORES:
{{#each messages}}
{{role}}: {{content}}
{{/each}}`,
});

const reportAIFlow = ai.defineFlow(
  {
    name: 'reportAIFlow',
    inputSchema: ReportAIInputSchema,
    outputSchema: ReportAIOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);