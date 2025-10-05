
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending intervention expiry notification emails using Resend.
 *
 * - sendExpiryNotification - A function that generates and sends a notification email for an expiring intervention.
 * - SendExpiryNotificationInput - The input type for the sendExpiryNotification function.
 * - SendExpiryNotificationOutput - The return type for the sendExpiryNotification function.
 */


import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { Resend } from 'resend';

const ResendConfigSchema = z.object({
  apiKey: z.string().describe('Resend API key.'),
  from: z.string().email().describe("The sender's email address."),
});

const SendExpiryNotificationInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the recipient (operator).'),
  interventionId: z.string().describe('The ID of the expiring intervention.'),
  interventionTitle: z.string().describe('The title of the expiring intervention.'),
  clientName: z.string().describe('The name of the client for the intervention.'),
  dueDate: z.string().describe('The due date of the intervention.'),
  resendConfig: ResendConfigSchema.describe('Resend configuration for sending the email.'),
  companyId: z.string().describe('The ID of the company.'),
});
export type SendExpiryNotificationInput = z.infer<typeof SendExpiryNotificationInputSchema>;

const SendExpiryNotificationOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  emailBody: z.string().optional().describe('The generated body of the email.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendExpiryNotificationOutput = z.infer<typeof SendExpiryNotificationOutputSchema>;


const prompt = ai.definePrompt({
  name: 'sendExpiryNotificationPrompt',
  input: {schema: z.object({
      interventionId: SendExpiryNotificationInputSchema.shape.interventionId,
      interventionTitle: SendExpiryNotificationInputSchema.shape.interventionTitle,
      clientName: SendExpiryNotificationInputSchema.shape.clientName,
      dueDate: SendExpiryNotificationInputSchema.shape.dueDate,
  })},
  output: {schema: z.object({ emailSubject: z.string(), emailBody: z.string() }) },
  prompt: `You are an AI assistant tasked with generating professional email notifications for expiring maintenance interventions.

Generate the subject and body of an email to be sent to an operator.

The email should be a friendly but urgent reminder about an intervention that is due soon.

Intervention ID: {{{interventionId}}}
Title: {{{interventionTitle}}}
Client: {{{clientName}}}
Due Date: {{{dueDate}}}

The email should:
1. Have a clear subject line like "AVVISO: Intervento in Scadenza".
2. Clearly state the intervention details (ID, title, client, due date).
3. Be written in Italian.
4. Urge the operator to complete the task as soon as possible.
5. End with a polite closing.

Output a JSON object with "emailSubject" and "emailBody" fields. Do not include "To:" in the body.
`,
});

const sendExpiryNotificationFlow = ai.defineFlow(
  {
    name: 'sendExpiryNotificationFlow',
    inputSchema: SendExpiryNotificationInputSchema,
    outputSchema: SendExpiryNotificationOutputSchema,
  },
  async (input) => {
    const { resendConfig, recipientEmail, companyId, ...promptInput } = input;
    let emailSubject = `Expiry for intervention #${input.interventionId}`;
    try {
      const { output } = await prompt(promptInput);

      if (!output || !output.emailBody || !output.emailSubject) {
          throw new Error('Failed to generate email content for expiry notification.');
      }
      
      emailSubject = output.emailSubject;

      const resend = new Resend(resendConfig.apiKey);

      const { data, error } = await resend.emails.send({
        from: resendConfig.from,
        to: [recipientEmail],
        subject: output.emailSubject,
        html: output.emailBody,
      });

      if (error) {
        throw error;
      }

      return { success: true, emailBody: output.emailBody };

    } catch (error: any) {
        console.error(`[sendExpiryNotificationFlow] FAILED for ${recipientEmail}:`, error.message);
        
        return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
    }
  }
);


export async function sendExpiryNotification(input: SendExpiryNotificationInput): Promise<SendExpiryNotificationOutput> {
    return sendExpiryNotificationFlow(input);
}
