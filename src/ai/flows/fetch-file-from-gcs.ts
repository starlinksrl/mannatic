'use server';
/**
 * @fileOverview A flow to fetch a file from Google Cloud Storage and return it as a data URI.
 *
 * - fetchFileFromGcs - Fetches a file and returns its content.
 * - FetchFileFromGcsInput - The input type for the function.
 * - FetchFileFromGcsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Storage } from '@google-cloud/storage';
import { FetchFileFromGcsInputSchema, FetchFileFromGcsOutputSchema } from '@/lib/types';
import type { FetchFileFromGcsInput, FetchFileFromGcsOutput } from '@/lib/types';

export async function fetchFileFromGcs(input: FetchFileFromGcsInput): Promise<FetchFileFromGcsOutput> {
  return fetchFileFromGcsFlow(input);
}

const fetchFileFromGcsFlow = ai.defineFlow(
  {
    name: 'fetchFileFromGcsFlow',
    inputSchema: FetchFileFromGcsInputSchema,
    outputSchema: FetchFileFromGcsOutputSchema,
  },
  async (input) => {
    try {
      const storage = new Storage({
        projectId: input.config.projectId,
        credentials: {
          client_email: input.config.clientEmail,
          private_key: input.config.privateKey.replace(/\\n/g, '\n'),
        },
      });

      const bucket = storage.bucket(input.config.bucketName);
      const file = bucket.file(input.filePath);
      
      const [metadata] = await file.getMetadata();
      const [contents] = await file.download();
      
      const dataUri = `data:${metadata.contentType};base64,${contents.toString('base64')}`;

      return { success: true, dataUri };
    } catch (error: any) {
      console.error('[fetchFileFromGcsFlow] FAILED:', error);
      
      let errorMessage = 'An unknown error occurred during file fetching.';
      if (error.code === 404) {
          errorMessage = 'File not found in the bucket.';
      } else if (error.message) {
          errorMessage = error.message;
      }

      return { success: false, error: errorMessage };
    }
  }
);
