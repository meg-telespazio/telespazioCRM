'use server';
/**
 * @fileOverview AI Flow to generate professional market and product news with sources and dates.
 * Integrates with MediaStack API and implements 24h caching in Firestore.
 * Implements a strict 7-day freshness filter and prevents AI hallucinations.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { adminDb } from '@/firebase/admin';

const NewsItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  title: z.string(),
  summary: z.string(),
  source: z.string().describe('The name of the news source, e.g., Bloomberg, Reuters, Starlink Blog.'),
  country: z.string().describe('The primary country associated with this news (Argentina, Brasil, Chile, Colombia, Costa Rica, Perú).'),
  url: z.string().describe('The actual URL from the news source. DO NOT hallucinate or create fake links.'),
  publishedAt: z.string().describe('The ISO date string of when the news was published (e.g. 2026-04-24T12:00:00Z).'),
});

const NewsOutputSchema = z.object({
  sectorNews: z.array(NewsItemSchema),
  productNews: z.array(NewsItemSchema),
  lastUpdated: z.string().optional(),
});

export type NewsOutput = z.infer<typeof NewsOutputSchema>;

const MEDIASTACK_API_KEY = 'edc31eb6a4d94c24081aa99637f364f4';

export async function fetchProfessionalNews(): Promise<NewsOutput> {
  const todayDateStr = new Date().toISOString().split('T')[0];
  const cacheRef = adminDb.collection('systemConfig').doc('news_cache');
  
  try {
    const cacheSnap = await cacheRef.get();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (cacheSnap.exists) {
      const cacheData = cacheSnap.data();
      const lastUpdated = cacheData?.timestamp?.toDate().getTime() || 0;
      const cacheDateStr = cacheData?.dateStr || '';
      
      // Si la caché es del mismo día y tiene menos de 24 horas, la usamos
      if (todayDateStr === cacheDateStr && (now - lastUpdated < oneDayMs)) {
        console.log('Serving fresh news from Firestore cache.');
        return cacheData?.news as NewsOutput;
      }
    }

    console.log(`Cache expired or date changed (${todayDateStr}). Fetching from MediaStack...`);
    
    // 1. Calcular rango de fechas (Últimos 7 días)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 2. Consultar MediaStack con parámetros estrictos
    // Países: ar, br, cl, co, cr, pe (Incluyendo Costa Rica)
    const mediaStackUrl = `https://api.mediastack.com/v1/news?access_key=${MEDIASTACK_API_KEY}&categories=business&countries=ar,br,cl,co,cr,pe&languages=es,en&limit=100&date=${sevenDaysAgo},${todayDateStr}`;
    
    let rawNewsData = "[]";
    try {
      const response = await fetch(mediaStackUrl);
      if (response.ok) {
        const json = await response.json();
        const newsItems = json.data || [];
        
        if (newsItems.length === 0) {
          console.warn("MediaStack returned zero news for the last 7 days.");
          return { sectorNews: [], productNews: [], lastUpdated: new Date().toISOString() };
        }
        
        rawNewsData = JSON.stringify(newsItems);
      } else {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (e) {
      console.error("MediaStack fetch failed:", e);
      if (cacheSnap.exists) return cacheSnap.data()?.news as NewsOutput;
      return { sectorNews: [], productNews: [], lastUpdated: new Date().toISOString() };
    }

    // 3. Procesar con Gemini para clasificar, resumir y asegurar presencia de fechas
    const result = await newsFlow({ rawFeed: rawNewsData });
    
    // 4. Guardar en caché con la fecha del día para control de invalidación
    const finalResult = {
      ...result,
      lastUpdated: new Date().toISOString()
    };

    await cacheRef.set({
      news: finalResult,
      timestamp: new Date(),
      dateStr: todayDateStr
    });

    return finalResult;
  } catch (error) {
    console.error('Error in news process:', error);
    return { sectorNews: [], productNews: [], lastUpdated: new Date().toISOString() };
  }
}

const prompt = ai.definePrompt({
  name: 'newsPrompt',
  input: { schema: z.object({ rawFeed: z.string() }) },
  output: { schema: NewsOutputSchema },
  prompt: `Eres el Analista de Inteligencia de Mercado de Telespazio. 
Tu tarea es procesar el siguiente feed de noticias de MediaStack y transformarlo en un reporte profesional.

FECHA ACTUAL DEL SISTEMA: ${new Date().toLocaleDateString()}

FEED DE NOTICIAS (MEDIASTACK):
{{{rawFeed}}}

REQUERIMIENTOS CRÍTICOS:
1. REGLA DE LOS 7 DÍAS: Ignora cualquier noticia que tenga más de 7 días de antigüedad comparado con la fecha actual.
2. NO HALUCINAR: Usa ÚNICAMENTE noticias reales que aparezcan en el feed provisto. No inventes noticias ni enlaces.
3. EMPRESAS: Prioriza noticias sobre empresas reales del sector (ej: YPF, Petrobras, Vale, Starlink, SpaceX, etc.).
4. PRODUCT NEWS: Busca específicamente noticias sobre Starlink, SpaceX o conectividad satelital en Argentina, Chile, Brasil, Colombia, Perú o Costa Rica.
5. FECHA OBLIGATORIA: El campo 'publishedAt' DEBE ser la fecha de publicación del artículo en formato ISO (YYYY-MM-DDTHH:mm:ssZ). No lo dejes vacío ni pongas guiones.
6. ENLACES: Usa la URL exacta proporcionada en el feed para el campo 'url'.

Clasifica las noticias de sectores en: Oil & Gas, Retail, Finanzas, Minería, Energía, Telecomunicaciones. Máximo 2 por sector.`,
});

const newsFlow = ai.defineFlow(
  {
    name: 'newsFlow',
    inputSchema: z.object({ rawFeed: z.string() }),
    outputSchema: NewsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return {
      sectorNews: output?.sectorNews || [],
      productNews: output?.productNews || [],
      lastUpdated: new Date().toISOString()
    };
  }
);
