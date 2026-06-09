'use server';
/**
 * @fileOverview AI Flow to generate professional market and product news with sources and dates.
 * Integrates with MediaStack API and implements 24h caching in Firestore.
 * Implements a strict 7-day freshness filter.
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
  publishedAt: z.string().describe('The ISO date string of when the news was published.'),
});

const NewsOutputSchema = z.object({
  sectorNews: z.array(NewsItemSchema),
  productNews: z.array(NewsItemSchema),
  lastUpdated: z.string().optional(),
});

export type NewsOutput = z.infer<typeof NewsOutputSchema>;

const MEDIASTACK_API_KEY = 'edc31eb6a4d94c24081aa99637f364f4';

export async function fetchProfessionalNews(): Promise<NewsOutput> {
  const cacheRef = adminDb.collection('systemConfig').doc('news_cache');
  
  try {
    const cacheSnap = await cacheRef.get();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (cacheSnap.exists) {
      const cacheData = cacheSnap.data();
      const lastUpdated = cacheData?.timestamp?.toDate().getTime() || 0;
      
      // Si la caché tiene menos de 24 horas, devolvemos los datos guardados
      if (now - lastUpdated < oneDayMs) {
        console.log('Serving news from Firestore cache.');
        return cacheData?.news as NewsOutput;
      }
    }

    console.log('Cache expired or missing. Fetching fresh news from MediaStack (Last 7 days)...');
    
    // 1. Calcular rango de fechas (Últimos 7 días)
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 2. Consultar MediaStack con rango de fechas
    // Filtramos por países relevantes: ar (Arg), br (Brasil), cl (Chile), co (Col), pe (Peru)
    const mediaStackUrl = `http://api.mediastack.com/v1/news?access_key=${MEDIASTACK_API_KEY}&categories=business&countries=ar,br,cl,co,pe&languages=es,en&limit=50&date=${sevenDaysAgo},${today}`;
    
    let rawNewsData = "[]";
    try {
      const response = await fetch(mediaStackUrl);
      if (response.ok) {
        const json = await response.json();
        rawNewsData = JSON.stringify(json.data || []);
      }
    } catch (e) {
      console.error("MediaStack fetch failed:", e);
    }

    // 3. Procesar con Gemini para clasificar y resumir según requerimientos de frescura
    const result = await newsFlow({ rawFeed: rawNewsData });
    
    // 4. Guardar en caché
    await cacheRef.set({
      news: result,
      timestamp: new Date(),
    });

    return result;
  } catch (error) {
    console.error('Error in news process:', error);
    // Fallback a una generación segura si todo lo demás falla
    return { sectorNews: [], productNews: [], lastUpdated: new Date().toISOString() };
  }
}

const prompt = ai.definePrompt({
  name: 'newsPrompt',
  input: { schema: z.object({ rawFeed: z.string() }) },
  output: { schema: NewsOutputSchema },
  prompt: `Eres el Analista de Inteligencia de Mercado de Telespazio. 
Tu tarea es procesar el siguiente feed de noticias crudo de MediaStack y transformarlo en un reporte profesional.

FECHA ACTUAL DEL SISTEMA: ${new Date().toLocaleDateString()}

FEED DE NOTICIAS (MEDIASTACK):
{{{rawFeed}}}

REQUERIMIENTOS CRÍTICOS DE VIGENCIA Y CALIDAD:
1. REGLA DE LOS 7 DÍAS: Descarta cualquier noticia que tenga más de 7 días de antigüedad respecto a la fecha actual. Solo queremos noticias MUY recientes. Si no hay noticias de la última semana, devuelve un array vacío [].
2. ENLACES (URL): Usa ÚNICAMENTE los enlaces reales provistos en el campo 'url' del feed. NUNCA inventes o generes URLs. Si una noticia no tiene URL válida o parece un placeholder, descártala.
3. CLASIFICACIÓN: Clasifica las noticias en estos sectores: Oil & Gas, Retail, Finanzas, Minería, Energía, Telecomunicaciones.
4. MÁXIMOS: Máximo 3 noticias por sector.
5. EMPRESAS: Selecciona noticias que involucren empresas REALES en la región (ej: YPF, Vale, Ecopetrol, Itaú, Falabella, etc.).
6. PRODUCT NEWS: Busca específicamente novedades sobre SpaceX, Starlink o conectividad satelital en la región (Argentina, Chile, Brasil, Colombia, Perú).
7. IDIOMA: Responde ÚNICAMENTE en Español con tono formal.

Para cada ítem provee:
- id: un string único.
- title: Título ejecutivo.
- summary: Resumen de máximo 2 líneas.
- source: La fuente real del feed.
- country: El país específico.
- url: El enlace original exacto del feed.
- publishedAt: La fecha original de publicación (ISO).`,
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
