
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for testing Google Cloud Storage connection.
 *
 * - testGcsConnection - A function that attempts to write a test file to a GCS bucket.
 * - TestGcsConnectionInput - The input type for the function.
 * - TestGcsConnectionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Storage } from '@google-cloud/storage';
import type { TestGcsConnectionInput, TestGcsConnectionOutput } from '@/lib/types';
import { TestGcsConnectionInputSchema, TestGcsConnectionOutputSchema } from '@/lib/types';


const testGcsConnectionFlow = ai.defineFlow(
  {
    name: 'testGcsConnectionFlow',
    inputSchema: TestGcsConnectionInputSchema,
    outputSchema: TestGcsConnectionOutputSchema,
  },
  async (input) => {
    try {
      const storage = new Storage({
        projectId: input.projectId,
        credentials: {
          client_email: input.clientEmail,
          private_key: input.privateKey.replace(/\\n/g, '\n'), // Ensure newlines are correctly formatted
        },
      });

      const bucket = storage.bucket(input.bucketName);
      const testFile = bucket.file('mannatic-test-file.txt');
      
      await testFile.save('This is a test file to verify write permissions.', {
        contentType: 'text/plain',
      });

      return { success: true };
    } catch (error: any) {
      console.error('[testGcsConnectionFlow] FAILED:', error);
      
      let errorMessage = 'An unknown error occurred.';
      if (error.code === 403) {
        errorMessage = 'Permission denied. Please check that the Service Account has the "Storage Object Admin" role for this bucket.';
      } else if (error.code === 404) {
        errorMessage = 'Bucket not found. Please ensure the bucket name is correct.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  }
);


export async function testGcsConnection(input: TestGcsConnectionInput): Promise<TestGcsConnectionOutput> {
    return testGcsConnectionFlow(input);
}
