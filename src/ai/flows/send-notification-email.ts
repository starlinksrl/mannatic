// src/ai/flows/send-notification-email.ts
'use server';

/**
 * @fileOverview An AI agent for generating maintenance notification emails.
 *
 * - sendNotificationEmail - A function that generates a notification email for scheduled maintenance.
 * - SendNotificationEmailInput - The input type for the sendNotificationEmail function.
 * - SendNotificationEmailOutput - The return type for the sendNotificationEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SendNotificationEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the recipient.'),
  maintenanceDetails: z.string().describe('A brief description of the scheduled maintenance.'),
  nextDueDate: z.string().describe('The next due date for the maintenance.'),
});
export type SendNotificationEmailInput = z.infer<typeof SendNotificationEmailInputSchema>;

const SendNotificationEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email generation was successful.'),
  emailBody: z.string().optional().describe('The generated body of the email.'),
});
export type SendNotificationEmailOutput = z.infer<typeof SendNotificationEmailOutputSchema>;


export async function sendNotificationEmail(input: SendNotificationEmailInput): Promise<SendNotificationEmailOutput> {
  return sendNotificationEmailFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sendNotificationEmailPrompt',
  input: {schema: SendNotificationEmailInputSchema},
  output: {schema: z.object({ emailBody: z.string() }) },
  prompt: `You are an AI assistant tasked with generating professional email notifications for scheduled maintenance tasks.

Generate the body of an email to be sent to {{{recipientEmail}}}.

The email should be a friendly but professional reminder about an upcoming scheduled maintenance.

Maintenance Details: {{{maintenanceDetails}}}
Next Due Date: {{{nextDueDate}}}

The email should:
1. Have a clear subject line like "Promemoria Manutenzione Programmata".
2. Clearly state the maintenance task and its due date.
3. Be written in Italian.
4. Be concise and to the point.
5. End with a polite closing.

Do not include the "To:" or "Subject:" lines in the output, only the body of the email.
`,
});

const sendNotificationEmailFlow = ai.defineFlow(
  {
    name: 'sendNotificationEmailFlow',
    inputSchema: SendNotificationEmailInputSchema,
    outputSchema: SendNotificationEmailOutputSchema,
  },
  async input => {
    // In a real-world scenario, you would integrate with an email sending service (e.g., SendGrid, Nodemailer) here.
    // For this prototype, we'll just generate the email content.
    
    console.log(`Simulating sending email to ${input.recipientEmail}`);

    const { output } = await prompt(input);

    if (output) {
        console.log(`Generated email body for ${input.recipientEmail}: \n${output.emailBody}`);
        return { success: true, emailBody: output.emailBody };
    }
    
    return { success: false };
  }
);
