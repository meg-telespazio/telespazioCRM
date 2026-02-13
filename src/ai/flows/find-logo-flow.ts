'use server';
/**
 * @fileOverview A utility to find and fetch a company logo from a website.
 * - findAndFetchLogo - a server action that finds a logo URL and returns it as a data URI.
 */

// Fetches an image from a URL and converts it to a data URI
async function fetchAndConvertToDataURI(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { cache: 'no-store', redirect: 'follow' });
        const contentType = response.headers.get('content-type');

        if (response.ok && contentType && contentType.startsWith('image/')) {
            const imageBuffer = await response.arrayBuffer();
            const base64String = Buffer.from(imageBuffer).toString('base64');
            return `data:${contentType};base64,${base64String}`;
        }
        return null;
    } catch (error) {
        console.warn(`Failed to fetch image from ${url}:`, error);
        return null;
    }
}

// Server action to be called from the client
export async function findAndFetchLogo({ websiteUrl }: { websiteUrl: string }): Promise<{ dataUri: string | null; error?: string; }> {
    let domain = '';
    try {
        // Ensure URL has a protocol for accurate domain extraction
        const urlWithProtocol = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
        domain = new URL(urlWithProtocol).hostname;
    } catch (e) {
        return { dataUri: null, error: 'Invalid website URL provided.' };
    }

    // 1. Try Clearbit first - it often has high-quality logos
    const clearbitUrl = `https://logo.clearbit.com/${domain}`;
    const clearbitResult = await fetchAndConvertToDataURI(clearbitUrl);
    if (clearbitResult) {
        return { dataUri: clearbitResult };
    }
    console.log(`Clearbit failed for ${domain}, trying Google Favicon service.`);

    // 2. Fallback to Google's Favicon service for a reliable, decent-quality icon
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    const googleFaviconResult = await fetchAndConvertToDataURI(googleFaviconUrl);
    if (googleFaviconResult) {
        return { dataUri: googleFaviconResult };
    }
    console.log(`Google Favicon service failed for ${domain}.`);
    
    // 3. If all attempts fail, return an error.
    return { dataUri: null, error: 'Could not find a logo for the specified website. Please upload one manually.' };
}
