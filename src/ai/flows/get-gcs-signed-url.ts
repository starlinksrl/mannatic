
'use server';
/**
 * @fileOverview Generates a time-limited signed URL for a private GCS object.
 * The file is never publicly accessible — only authenticated platform users
 * can trigger this server action.
 */

import { Storage } from '@google-cloud/storage';
import { getAppConfiguration } from '@/lib/data';

/**
 * Generates a signed URL for a private GCS object.
 * The URL expires in 1 hour.
 *
 * @param gcsPath - The object path inside the bucket (e.g. "quotes/abc-myfile.pdf")
 * @returns The signed URL string
 */
export async function getQuoteSignedUrl(gcsPath: string): Promise<string> {
    if (gcsPath.startsWith('http://') || gcsPath.startsWith('https://')) {
        return gcsPath;
    }
    try {
        const { getSignedFileUrl } = await import('@/lib/supabase-storage');
        return await getSignedFileUrl(gcsPath);
    } catch (e) {
        console.warn('Error fetching Supabase signedUrl for quote:', e);
    }
    return gcsPath;
}
