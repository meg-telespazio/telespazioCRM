'use server';
/**
 * @fileOverview AI Flow to generate a structured business description for a client.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ClientDescriptionInputSchema = z.object({
  name: z.string().describe('The name of the company.'),
  website: z.string().optional().describe('The company website URL.'),
  sector: z.string().optional().describe('The business sector/industry.'),
});

export type ClientDescriptionInput = z.infer<typeof ClientDescriptionInputSchema>;

export async function generateClientAiDescription(input: ClientDescriptionInput): Promise<string> {
  const result = await clientDescriptionFlow(input);
  return result;
}

const prompt = ai.definePrompt({
  name: 'clientDescriptionPrompt',
  input: { schema: ClientDescriptionInputSchema },
  prompt: `You are a professional business research assistant for T-Track CRM. 
Your goal is to provide a concise, structured description of the following company:

Name: {{{name}}}
Website: {{{website}}}
Sector: {{{sector}}}

INSTRUCTIONS:
1. Provide a clear description of what the company does (business model).
2. Specify if it is a public company (cotiza en bolsa) or private.
3. List the main geographical regions where it has a presence.
4. If available, mention the approximate number of employees.
5. If it belongs to a specific economic group or holding, mention it.
6. The total length MUST NOT exceed 500 characters.
7. Language: Spanish (Professional tone).

Do NOT use markdown headers or bolding. Just plain text.`,
});

const clientDescriptionFlow = ai.defineFlow(
  {
    name: 'clientDescriptionFlow',
    inputSchema: ClientDescriptionInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { text } = await prompt(input);
    return text;
  }
);
