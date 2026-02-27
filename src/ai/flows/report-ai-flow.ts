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
    operator: z.enum(['contains', 'equals', 'not_equals', 'gt', 'lt', 'gte', 'lte', 'is', 'is_not']),
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

SCHEMA CONTEXT:
{{{schemaContext}}}

RELATIONSHIP RULES:
1. 'services' link to 'purchaseOrders' via 'poId'.
2. 'purchaseOrders' link to 'contracts' via 'contractId'.
3. 'contracts' link to 'clients' via 'clientId'.
4. 'equipment' link to 'services' via 'currentServiceId'.
5. 'contacts' link to 'clients' via 'clientId'.
6. 'opportunities' link to 'clients' via 'clientId'.

CRITICAL INSTRUCTIONS:
1. BE CONVERSATIONAL: Before jumping to a 'config', if the user's request is broad (e.g., "report of services"), ASK for details like: "Which fields do you want to see?", "Should I group them by client?", "Do you want to see the total sum of monthly fees or the individual list?".
2. AGGREGATIONS (TOTALS): If the user mentions "total", "sum", "average", or "summary", you MUST use the 'aggregations' and 'groupBy' fields in the config. For example, to show total monthly fee per client, set primaryDataSource to 'services', groupBy to 'clients.name', and an aggregation for 'services.monthlyFee' with type 'sum'.
3. DATA RETRIEVAL: Always ensure the 'primaryDataSource' is the one that contains the main metric or records (e.g., for fees, use 'services').
4. LANGUAGE: Always respond in the same language the user is using (usually Spanish).

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
