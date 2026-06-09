'use server';
/**
 * @fileOverview AI Flow to generate professional market and product news with sources.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const NewsItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  title: z.string(),
  summary: z.string(),
  source: z.string().describe('The name of the news source, e.g., Bloomberg, Reuters, Starlink Blog.'),
  url: z.string(),
});

const NewsOutputSchema = z.object({
  sectorNews: z.array(NewsItemSchema),
  productNews: z.array(NewsItemSchema),
});

export type NewsOutput = z.infer<typeof NewsOutputSchema>;

export async function fetchProfessionalNews(): Promise<NewsOutput> {
  const result = await newsFlow({});
  return result;
}

const prompt = ai.definePrompt({
  name: 'newsPrompt',
  output: { schema: NewsOutputSchema },
  prompt: `You are a professional business journalist for a major tech and telecommunications CRM.
Generate a set of highly realistic current news summaries (as of 2025/2026) for the following categories.

SECTOR NEWS (2 items per category):
- Oil & Gas
- Retail
- Finanzas
- Minería
- Energía
- Telecomunicaciones

PRODUCT NEWS (Noticias sobre SpaceX, Starlink y revendedores en Chile, Argentina, Peru, Colombia, Brasil y Costa Rica):
- Generar al menos 4 noticias relevantes sobre despliegue, nuevos acuerdos corporativos o hitos tecnológicos de Starlink/SpaceX en estos países.

INSTRUCTIONS:
1. Language: Spanish (Professional and formal tone).
2. For each item provide:
   - title: Short and catchy.
   - summary: 2 lines max.
   - source: A realistic news source name.
   - url: A believable news URL or corporate blog link.
3. The news must be business-oriented and relevant for sales executives.`,
});

const newsFlow = ai.defineFlow(
  {
    name: 'newsFlow',
    inputSchema: z.object({}),
    outputSchema: NewsOutputSchema,
  },
  async () => {
    const { output } = await prompt({});
    return output!;
  }
);
