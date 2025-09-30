
'use server';
/**
 * @fileOverview A flow to upload a file to Google Cloud Storage.
 *
 * - uploadFileToGcs - A function that uploads a file from a data URI.
 * - UploadFileToGcsInput - The input type for the function.
 * - UploadFileToGcsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Storage } from '@google-cloud/storage';

const GcsConfigSchema = z.object({
    projectId: z.string(),
    clientEmail: z.string(),
    privateKey: z.string(),
    bucketName: z.string(),
});

const UploadFileToGcsInputSchema = z.object({
  fileDataUri: z.string().describe("The file content as a data URI."),
  fileName: z.string().describe("The desired file name/path in the bucket."),
  config: GcsConfigSchema,
});
export type UploadFileToGcsInput = z.infer<typeof UploadFileToGcsInputSchema>;

const UploadFileToGcsOutputSchema = z.object({
  success: z.boolean(),
  fileUrl: z.string().optional(),
  error: z.string().optional(),
});
export type UploadFileToGcsOutput = z.infer<typeof UploadFileToGcsOutputSchema>;

export async function uploadFileToGcs(input: UploadFileToGcsInput): Promise<UploadFileToGcsOutput> {
  return uploadFileToGcsFlow(input);
}

const uploadFileToGcsFlow = ai.defineFlow(
  {
    name: 'uploadFileToGcsFlow',
    inputSchema: UploadFileToGcsInputSchema,
    outputSchema: UploadFileToGcsOutputSchema,
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
      const file = bucket.file(input.fileName);

      const dataUriParts = input.fileDataUri.split(',');
      const mimeType = dataUriParts[0].match(/:(.*?);/)?.[1];
      const fileBuffer = Buffer.from(dataUriParts[1], 'base64');
      
      await file.save(fileBuffer, {
        contentType: mimeType,
        public: true, // Make the file publicly readable
      });
      
      const publicUrl = `https://storage.googleapis.com/${input.config.bucketName}/${input.fileName}`;

      return { success: true, fileUrl: publicUrl };
    } catch (error: any) {
      console.error('[uploadFileToGcsFlow] FAILED:', error);
      return { success: false, error: error.message || 'An unknown error occurred during upload.' };
    }
  }
);
