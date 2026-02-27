
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
  aggregations: z.array(z.object({
    field: z.string(),
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

INSTRUCTIONS:
1. Analyze the user message and history.
2. If the request is clear, return a 'config' with the data source, fields, filters, and sorts.
3. Use only the fields and collections defined in the SCHEMA CONTEXT.
4. If the request is ambiguous (e.g., "I want a report of sales" - which stage? which period?), return a 'question' to ask for details.
5. In the 'text' field, explain what you are doing (e.g., "I've generated a report showing active clients with their total monthly fees").
6. For date filters, assume relative terms (like "this month") should be translated to actual date ranges if possible, or keep them generic if not.
7. Available Data Sources: clients, contacts, opportunities, productsAndServices, contracts, purchaseOrders, services, equipment, activities, locations.

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
