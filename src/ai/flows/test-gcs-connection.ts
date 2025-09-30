
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

export const TestGcsConnectionInputSchema = z.object({
  projectId: z.string().describe('Google Cloud Project ID.'),
  clientEmail: z.string().email().describe('Service Account client email.'),
  privateKey: z.string().describe('Service Account private key.'),
  bucketName: z.string().describe('The GCS bucket name.'),
});
export type TestGcsConnectionInput = z.infer<typeof TestGcsConnectionInputSchema>;

export const TestGcsConnectionOutputSchema = z.object({
  success: z.boolean().describe('Whether the connection test was successful.'),
  error: z.string().optional().describe('Error message if the test failed.'),
});
export type TestGcsConnectionOutput = z.infer<typeof TestGcsConnectionOutputSchema>;

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
      
      // Optional: Delete the file after successful write to keep the bucket clean
      await testFile.delete();

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
