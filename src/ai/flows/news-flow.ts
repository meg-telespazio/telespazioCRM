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
  country: z.string().describe('The primary country associated with this news (e.g., Argentina, Chile, Global).'),
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
Generate a set of highly realistic current news summaries (dated in 2025 or 2026) for the following categories. 

CRITICAL: Each news item MUST be about a specific REAL-WORLD company (e.g., YPF, Mercado Libre, Vale, Petrobras, Itaú, Antofagasta Minerals, Enel, etc.) and its recent business moves.

SECTOR NEWS (2 items per category):
- Oil & Gas (Focus on companies like YPF, Petrobras, Ecopetrol)
- Retail (Focus on companies like Falabella, Mercado Libre, Cencosud)
- Finanzas (Focus on companies like Itaú, Banco de Chile, Nubank, Galicia)
- Minería (Focus on companies like Codelco, Vale, Southern Copper)
- Energía (Focus on companies like Enel, Engie, Pampa Energía)
- Telecomunicaciones (Focus on companies like América Móvil, Telefónica, Entel)

PRODUCT NEWS (Focus on SpaceX and Starlink deployment or resellers like Telespazio, Sencinet in these specific countries):
- Generar noticias relevantes para: Argentina, Brasil, Chile, Colombia, Costa Rica y Perú.
- Al menos 4 noticias sobre acuerdos corporativos, lanzamientos de terminales Enterprise o hitos de conectividad rural/marítima.

INSTRUCTIONS:
1. Language: Spanish (Professional and formal tone).
2. For each item provide:
   - title: Short, catchy, and company-focused.
   - summary: 2 lines max about the business impact.
   - source: A realistic business news source (Bloomberg, Reuters, corporate blogs).
   - country: The specific country (Argentina, Brasil, Chile, Colombia, Costa Rica, o Perú). Use 'Global' only if it truly affects all.
   - url: A believable URL format.
3. The context is strictly business-oriented for sales executives.`,
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
