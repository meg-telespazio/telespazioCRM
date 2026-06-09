'use server';
/**
 * @fileOverview AI Flow to generate professional market and product news with sources and dates.
 * Integrates with MediaStack API and implements 24h caching in Firestore.
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

    console.log('Cache expired or missing. Fetching fresh news from MediaStack...');
    
    // 1. Consultar MediaStack
    // Filtramos por países relevantes: ar (Arg), br (Brasil), cl (Chile), co (Col), pe (Peru)
    const mediaStackUrl = `http://api.mediastack.com/v1/news?access_key=${MEDIASTACK_API_KEY}&categories=business&countries=ar,br,cl,co,pe&languages=es,en&limit=30`;
    
    let rawNewsData = "No hay datos recientes disponibles.";
    try {
      const response = await fetch(mediaStackUrl);
      if (response.ok) {
        const json = await response.json();
        rawNewsData = JSON.stringify(json.data || []);
      }
    } catch (e) {
      console.error("MediaStack fetch failed:", e);
    }

    // 2. Procesar con Gemini para clasificar y resumir según requerimientos
    const result = await newsFlow({ rawFeed: rawNewsData });
    
    // 3. Guardar en caché
    await cacheRef.set({
      news: result,
      timestamp: new Date(),
    });

    return result;
  } catch (error) {
    console.error('Error in news process:', error);
    // Fallback a una generación pura de IA si todo lo demás falla
    return newsFlow({ rawFeed: "Error en API" });
  }
}

const prompt = ai.definePrompt({
  name: 'newsPrompt',
  input: { schema: z.object({ rawFeed: z.string() }) },
  output: { schema: NewsOutputSchema },
  prompt: `Eres el Analista de Inteligencia de Mercado de Telespazio. 
Tu tarea es procesar el siguiente feed de noticias crudo de MediaStack y transformarlo en un reporte profesional para ejecutivos de ventas.

FEED DE NOTICIAS (MEDIASTACK):
{{{rawFeed}}}

REQUERIMIENTOS CRÍTICOS:
1. ENLACES (URL): Usa ÚNICAMENTE los enlaces reales provistos en el campo 'url' del feed. NUNCA inventes, completes o generes URLs que no existan en los datos de entrada. Si una noticia no tiene URL válida, descártala.
2. FECHA: Extrae la fecha real del campo 'published_at' de cada noticia.
3. CLASIFICACIÓN: Clasifica las noticias en estos sectores: Oil & Gas, Retail, Finanzas, Minería, Energía, Telecomunicaciones.
4. MÁXIMOS: Máximo 2 noticias por sector.
5. EMPRESAS: Selecciona noticias que involucren empresas REALES (ej: YPF, Mercado Libre, Vale, Petrobras, Itaú, Enel, etc.).
6. PRODUCT NEWS: Busca específicamente novedades sobre SpaceX, Starlink o sus competidores directos en la región (Argentina, Chile, Brasil, Colombia, Perú).
7. IDIOMA: Responde ÚNICAMENTE en Español. Tono formal y ejecutivo.

Para cada ítem provee:
- id: un string único (puedes usar el provisto o generar uno).
- title: Título enfocado en la empresa y su movimiento estratégico.
- summary: Resumen de máximo 2 líneas sobre el impacto en el negocio.
- source: La fuente real (ej: Bloomberg, Reuters, Diario Financiero).
- country: El país específico (Argentina, Brasil, Chile, Colombia, Costa Rica, o Perú).
- url: El enlace original exacto del feed.
- publishedAt: La fecha original de publicación.`,
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
      ...output!,
      lastUpdated: new Date().toISOString()
    };
  }
);