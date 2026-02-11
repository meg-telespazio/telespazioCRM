'use server';
/**
 * @fileOverview An AI flow to find and fetch a company logo from a website.
 * - findAndFetchLogo - A server action that finds a logo URL and returns it as a data URI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindLogoInputSchema = z.object({
  url: z.string().url().describe('The URL of the company website.'),
});

// Allow relative URLs from the model, we will resolve them later.
const FindLogoOutputSchema = z.object({
  logoUrl: z.string().describe("The URL (can be relative or absolute) of the company's main logo image."),
});

const findLogoPrompt = ai.definePrompt({
    name: 'findLogoPrompt',
    input: { schema: FindLogoInputSchema },
    output: { schema: FindLogoOutputSchema },
    prompt: `You are an expert web-scraping assistant. Your task is to find the best possible logo for a company from their website.

Analyze the content of the website at the following URL: {{{url}}}

Follow these steps in order:
1.  Look for the primary logo image in the page content (e.g., in the header, navigation bar). It's often an <img> tag with "logo" in its filename, src, or alt attribute. Prefer SVG or PNG formats.
2.  If you can't find a clear logo, look in the <head> section for <link> tags with rel="icon", rel="shortcut icon", or rel="apple-touch-icon". These are favicons and can be used as a logo.
3.  Return the **absolute URL** for the best image file you find. If you find a relative URL, you MUST convert it to an absolute URL based on the input URL.
4.  If you cannot find any logo or icon URL after checking both the body and the head, return an empty string for the \`logoUrl\`.`,
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
    // 1. Try to find and fetch logo using AI
    try {
        const { logoUrl: rawLogoUrl } = await findLogoFlow({ url: websiteUrl });

        if (rawLogoUrl) {
            // A URL was found, try to fetch it
            const absoluteLogoUrl = new URL(rawLogoUrl, websiteUrl).href;
            const response = await fetch(absoluteLogoUrl);

            if (response.ok) {
                // Success! Convert and return.
                const imageBuffer = await response.arrayBuffer();
                const contentType = response.headers.get('content-type') || 'image/png';
                const base64String = Buffer.from(imageBuffer).toString('base64');
                const dataUri = `data:${contentType};base64,${base64String}`;
                return { dataUri };
            }
        }
        // If no URL was found or fetch failed, fall through to favicon attempt
    } catch (error) {
        console.warn('AI logo find/fetch failed, falling back to favicon:', error);
    }

    // 2. Fallback: try to fetch the favicon
    try {
        const faviconUrl = new URL('/favicon.ico', websiteUrl).href;
        const faviconResponse = await fetch(faviconUrl);
        if (!faviconResponse.ok) {
            throw new Error(`Favicon not found or fetch failed: ${faviconResponse.statusText}`);
        }

        const faviconBuffer = await faviconResponse.arrayBuffer();
        const contentType = faviconResponse.headers.get('content-type') || 'image/x-icon';
        const base64String = Buffer.from(faviconBuffer).toString('base64');
        const dataUri = `data:${contentType};base64,${base64String}`;
        return { dataUri };
    } catch (faviconError) {
        console.error('All logo fetching attempts failed:', faviconError);
        throw new Error('Could not find a logo or favicon on the specified website.');
    }
}
