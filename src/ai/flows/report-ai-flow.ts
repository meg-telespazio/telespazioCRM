'use server';
/**
 * @fileOverview AI Flow to generate report configurations based on natural language queries.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ReportConfigSchema = z.object({
  primaryDataSource: z.enum(['clients', 'contacts', 'opportunities', 'productsAndServices', 'contracts', 'purchaseOrders', 'services', 'equipment', 'activities', 'locations']),
  fields: z.array(z.string()).describe('List of fields to show in the report, format: "collection.field" (e.g., "clients.name")'),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['contains', 'equals', 'not_equals', 'gt', 'lt', 'gte', 'lte', 'is', 'is_not', 'is_not_empty']),
    value: z.any(),
  })),
  sorting: z.array(z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']),
  })),
  groupBy: z.string().optional().describe('Field to group data by if aggregations are used (e.g., "clients.name")'),
  aggregations: z.array(z.object({
    field: z.string().describe('Field to aggregate, format: "collection.field"'),
    type: z.enum(['sum', 'avg', 'count']),
  })).optional(),
});

const ReportAIInputSchema = z.object({
  messages: z.array(MessageSchema),
  schemaContext: z.string().describe('The database entities and properties schema.'),
});

const ReportAIOutputSchema = z.object({
  type: z.enum(['question', 'config']),
  text: z.string().describe('A friendly message explaining what the AI found or asking for details.'),
  config: ReportConfigSchema.optional(),
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
  prompt: `You are an expert data analyst for T-Track CRM. 
Your job is to translate natural language user requests into a structured report configuration.

SCHEMA CONTEXT (Crucial for field names):
{{{schemaContext}}}

MAPPING HINTS FOR SECTORS:
- "Banca" or "Bancos" matches sector: "Finance"
- "Oil & Gas" or "Petroleo" matches sector: "Energy"
- "Mineria" matches sector: "Mining"
- "Retail" or "Comercio" matches sector: "Retail"

RELATIONSHIP RULES (How to join tables):
1. 'services' (Installed base) MUST link to 'purchaseOrders' via 'poId'.
2. 'purchaseOrders' link to 'contracts' via 'contractId'.
3. 'contracts' link to 'clients' via 'clientId'.
4. 'equipment' (Hardware) link to 'services' via 'currentServiceId'.
5. 'contacts' link to 'clients' via 'clientId'.
6. 'opportunities' link to 'clients' via 'clientId'.

CRITICAL INSTRUCTIONS:
1. BE CONVERSATIONAL & DETAILED: Do NOT generate a 'config' immediately unless the user provided ALL details (Fields, Filters, Grouping). 
2. ASK BEFORE ACTING: If the user says "Quiero un reporte de servicios de Western Union", you should respond: "Entendido. ¿Qué datos de los servicios quieres ver? (ej: Nickname, Abono Mensual, Plan). ¿Prefieres el listado detallado o que totalice los montos por cliente?".
3. DATA SOURCE CHOICE: If the user wants totals or metrics about services (like monthly fees), ALWAYS use 'services' as the primaryDataSource.
4. FUZZY SEARCH: ALWAYS use 'contains' operator for text fields like 'clients.sector' or 'clients.name' to avoid case-sensitivity issues.
5. AGGREGATIONS: Use 'aggregations' and 'groupBy' ONLY when the user asks for totals, summaries, or averages.
6. FILTERS: When filtering by a client name, the field is 'clients.name'.
7. LANGUAGE: Always respond in the same language the user is using (usually Spanish).

MESSAGES:
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
