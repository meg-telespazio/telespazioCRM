'use server';
/**
 * @fileOverview An AI flow to find and fetch a company logo from a website.
 * - findAndFetchLogo - a server action that finds a logo URL and returns it as a data URI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindLogoInputSchema = z.object({
  url: z.string().url().describe('The URL of the company website.'),
});

// Allow relative URLs from the model, we will resolve them later.
const FindLogoOutputSchema = z.object({
  logoUrl: z.string().describe("The URL (can be relative, absolute, or a data URI) of the company's main logo image."),
});

const findLogoPrompt = ai.definePrompt({
    name: 'findLogoPrompt',
    input: { schema: FindLogoInputSchema },
    output: { schema: FindLogoOutputSchema },
    prompt: `You are an expert web-scraping assistant. Your primary goal is to find the main, high-quality company logo from their website's homepage. Avoid low-quality favicons unless no other logo can be found.

Analyze the HTML content of the website at the following URL: {{{url}}}

Follow these steps with precision:
1.  **Prioritize the Header/Navigation:** The main logo is almost always in the site's primary header or navigation bar. It's often an \`<img>\` tag inside a link \`<a>\` that points to the homepage.
2.  **Identify the Logo Image:**
    *   Look for \`<img>\` tags where \`src\`, \`alt\`, \`class\`, or \`id\` attributes contain words like "logo", "brand".
    *   Prefer vector formats like SVG (\`.svg\`) over raster formats like PNG or JPG if available. They offer the best quality.
    *   The \`src\` attribute could be a relative URL, an absolute URL, or a \`data:\` URI.
    *   Sometimes the logo is an \`<svg>\` element directly in the HTML. If you find an inline SVG, you cannot return it as you can only return URLs or data URIs. Instead, look for an \`<img>\` tag as a fallback.
3.  **URL Handling:**
    *   If you find a \`data:\` URI in an \`src\` attribute, return it directly.
    *   If you find a relative URL (e.g., \`/images/logo.svg\`), you **MUST** convert it to an absolute URL using the original website URL as the base. For example, if the website is \`https://example.com\` and you find \`/logo.png\`, the absolute URL is \`https://example.com/logo.png\`.
    *   If you find an absolute URL, return it as is.
4.  **Favicon as Absolute Last Resort:** Only if you have exhausted all other options and can find absolutely no other logo in the \`<body>\`, then as a last resort, look in the \`<head>\` for \`<link rel="icon" ...>\`.
5.  **Return Value:**
    *   Return the best, highest-resolution logo URL you can find.
    *   If after all checks you find no suitable logo, return an empty string for \`logoUrl\`. Do not guess.`,
});

const findLogoFlow = ai.defineFlow(
    {
        name: 'findLogoFlow',
        inputSchema: FindLogoInputSchema,
        outputSchema: FindLogoOutputSchema,
    },
    async (input) => {
        const { output } = await findLogoPrompt(input);
        // If output is null or logoUrl is empty, return an object with an empty logoUrl.
        return output || { logoUrl: '' };
    }
);

// Server action to be called from the client
export async function findAndFetchLogo({ websiteUrl }: { websiteUrl: string }): Promise<{ dataUri: string }> {
    // 0. Extract domain
    let domain = '';
    try {
        domain = new URL(websiteUrl).hostname;
    } catch (e) {
        throw new Error('Invalid website URL provided.');
    }

    // 1. Try Clearbit first
    try {
        const clearbitUrl = `https://logo.clearbit.com/${domain}`;
        const response = await fetch(clearbitUrl, { cache: 'no-store' });
        
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && contentType.startsWith('image/')) {
            const imageBuffer = await response.arrayBuffer();
            const base64String = Buffer.from(imageBuffer).toString('base64');
            const dataUri = `data:${contentType};base64,${base64String}`;
            return { dataUri };
        }
    } catch (error) {
        console.warn('Clearbit fetch failed, falling back to AI:', error);
    }
    
    // 2. If Clearbit fails, try to find and fetch logo using AI
    try {
        const { logoUrl: rawLogoUrl } = await findLogoFlow({ url: websiteUrl });

        if (rawLogoUrl) {
            // Handle if the model returns a data URI directly
            if (rawLogoUrl.startsWith('data:image')) {
                return { dataUri: rawLogoUrl };
            }
            
            // A URL was found, try to fetch it
            const absoluteLogoUrl = new URL(rawLogoUrl, websiteUrl).href;
            const response = await fetch(absoluteLogoUrl);

            const contentType = response.headers.get('content-type');
            if (response.ok && contentType && contentType.startsWith('image/')) {
                const imageBuffer = await response.arrayBuffer();
                const base64String = Buffer.from(imageBuffer).toString('base64');
                const dataUri = `data:${contentType};base64,${base64String}`;
                return { dataUri };
            }
        }
    } catch (error) {
        console.error('AI logo find/fetch failed:', error);
        throw new Error('The AI assistant could not find a valid logo.');
    }

    // If all high-quality attempts fail, throw an error.
    console.error('All high-quality logo fetching attempts failed.');
    throw new Error('Could not find a logo for the specified website. Please upload one manually.');
}
