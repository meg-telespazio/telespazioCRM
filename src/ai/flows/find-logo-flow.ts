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
    prompt: `You are an expert web-scraping assistant. Your task is to find the main logo of a company from their website.
    
    Analyze the content of the website at the following URL: {{{url}}}
    
    Identify the primary logo image. It might be in the header, navigation bar, or footer. It's often an SVG or PNG file and might have "logo" in its filename or alt text.
    
    Return the absolute URL for the logo image file. Make sure the URL is complete and directly points to the image resource. If you cannot find a logo, return an empty string for the logoUrl.`,
});

const findLogoFlow = ai.defineFlow(
    {
        name: 'findLogoFlow',
        inputSchema: FindLogoInputSchema,
        outputSchema: FindLogoOutputSchema,
    },
    async (input) => {
        const { output } = await findLogoPrompt(input);
        if (!output?.logoUrl) {
            throw new Error('Could not find a logo on the specified website.');
        }
        return output;
    }
);

// Server action to be called from the client
export async function findAndFetchLogo({ websiteUrl }: { websiteUrl: string }): Promise<{ dataUri: string }> {
    // 1. Find the logo URL using the Genkit flow
    const { logoUrl: rawLogoUrl } = await findLogoFlow({ url: websiteUrl });

    // 2. Resolve the potentially relative URL to an absolute one
    const absoluteLogoUrl = new URL(rawLogoUrl, websiteUrl).href;

    // 3. Fetch the image from the URL
    const response = await fetch(absoluteLogoUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch logo image: ${response.statusText}`);
    }

    // 4. Convert to buffer and then to data URI
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    const base64String = Buffer.from(imageBuffer).toString('base64');
    const dataUri = `data:${contentType};base64,${base64String}`;

    return { dataUri };
}
