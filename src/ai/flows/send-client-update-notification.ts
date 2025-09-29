'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending intervention update notification emails to clients.
 *
 * - sendClientUpdateNotification - A function that generates and sends a notification email to a client about an intervention.
 * - SendClientUpdateNotificationInput - The input type for the function.
 * - SendClientUpdateNotificationOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const SmtpConfigSchema = z.object({
  host: z.string().describe('SMTP server host.'),
  port: z.number().describe('SMTP server port.'),
  user: z.string().describe('SMTP username.'),
  pass: z.string().describe('SMTP password.'),
  from: z.string().email().describe('The sender\'s email address.'),
});

const SendClientUpdateNotificationInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the client.'),
  interventionId: z.string().describe('The ID of the intervention.'),
  interventionTitle: z.string().describe('The title of the intervention.'),
  interventionStatus: z.string().describe('The current status of the intervention.'),
  updateMessage: z.string().describe('The content of the update (e.g., "creato" or a specific comment).'),
  clientName: z.string().describe('The name of the client.'),
  interventionLink: z.string().url().optional().describe('A direct link to view the intervention in the app.'),
  smtpConfig: SmtpConfigSchema.describe('SMTP server configuration for sending the email.'),
  companyId: z.string().describe('The ID of the company.'),
});
export type SendClientUpdateNotificationInput = z.infer<typeof SendClientUpdateNotificationInputSchema>;

const SendClientUpdateNotificationOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  emailBody: z.string().optional().describe('The generated body of the email.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendClientUpdateNotificationOutput = z.infer<typeof SendClientUpdateNotificationOutputSchema>;


const prompt = ai.definePrompt({
  name: 'clientUpdateNotificationPrompt',
  input: {schema: z.object({
      clientName: SendClientUpdateNotificationInputSchema.shape.clientName,
      interventionId: SendClientUpdateNotificationInputSchema.shape.interventionId,
      interventionTitle: SendClientUpdateNotificationInputSchema.shape.interventionTitle,
      interventionStatus: SendClientUpdateNotificationInputSchema.shape.interventionStatus,
      updateMessage: SendClientUpdateNotificationInputSchema.shape.updateMessage,
      interventionLink: SendClientUpdateNotificationInputSchema.shape.interventionLink,
  })},
  output: {schema: z.object({ emailSubject: z.string(), emailBody: z.string() }) },
  prompt: `You are an AI assistant for a business software called MannaTic. Your task is to generate a notification email for a client regarding their maintenance intervention. The email must be in **Italian**.

Generate a professional and clear subject and body for the email.

Client's Name: {{{clientName}}}
Intervention ID: {{{interventionId}}}
Intervention Title: {{{interventionTitle}}}
Current Status: {{{interventionStatus}}}
Update Details: {{{updateMessage}}}
Intervention Link: {{{interventionLink}}}

The email should:
1. Have a clear subject line. If the update message is "creato", the subject should be "Conferma Creazione Intervento #{{{interventionId}}}". Otherwise, it should be "Aggiornamento Intervento #{{{interventionId}}}: {{{interventionTitle}}}".
2. Greet the client by name (e.g., "Gentile {{{clientName}}},").
3. Inform them that there is an update regarding their intervention.
4. Clearly state the intervention details (ID, title, and current status).
5. Include the specific update message.
{{#if interventionLink}}
6. Provide a clear call-to-action button to view the intervention details using the provided link. The button should say "Visualizza Dettagli Intervento".
{{else}}
6. Reassure them that they can view all details by logging into their MannaTic dashboard.
{{/if}}
7. End with a professional closing, like "Cordiali saluti, Il Team di MannaTic".

Output a JSON object with "emailSubject" and "emailBody" fields. The emailBody should be in HTML format, using a clean design with a prominent call-to-action button if the link is present.
`,
});

const sendClientUpdateNotificationFlow = ai.defineFlow(
  {
    name: 'sendClientUpdateNotificationFlow',
    inputSchema: SendClientUpdateNotificationInputSchema,
    outputSchema: SendClientUpdateNotificationOutputSchema,
  },
  async (input) => {
    let emailSubject = `Update for intervention #${input.interventionId}`;
    try {
      const { smtpConfig, recipientEmail, companyId, ...promptInput } = input;
      
      console.log(`[sendClientUpdateNotificationFlow] START for intervention #${input.interventionId} to ${recipientEmail} for company ${companyId}.`);
      
      const { output } = await prompt(promptInput);

      if (!output || !output.emailBody || !output.emailSubject) {
          console.error('[sendClientUpdateNotificationFlow] ERROR: Failed to generate email content from prompt. Output was:', output);
          throw new Error('Failed to generate email content for client update notification.');
      }
      
      emailSubject = output.emailSubject;
      console.log(`[sendClientUpdateNotificationFlow] Email content generated. Subject: ${emailSubject}`);

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });
      
      console.log(`[sendClientUpdateNotificationFlow] Sending email to ${recipientEmail} via ${smtpConfig.host}.`);

      const info = await transporter.sendMail({
        from: smtpConfig.from,
        to: recipientEmail,
        subject: output.emailSubject,
        html: output.emailBody,
      });

      console.log('[sendClientUpdateNotificationFlow] Email sent successfully. Response:', info.response);
      
      await addDoc(collection(db, 'emailLogs'), {
        companyId: companyId,
        timestamp: new Date().toISOString(),
        recipient: recipientEmail,
        subject: output.emailSubject,
        status: 'success',
        response: info.response,
      });

      return { success: true, emailBody: output.emailBody };

    } catch (error: any) {
        console.error('[sendClientUpdateNotificationFlow] FAILED:', error.message);
        
        await addDoc(collection(db, 'emailLogs'), {
            companyId: input.companyId,
            timestamp: new Date().toISOString(),
            recipient: input.recipientEmail,
            subject: emailSubject,
            status: 'failure',
            response: error.response || 'N/A',
            error: error.message || 'An unknown error occurred.',
        });

        return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
    }
  }
);

export async function sendClientUpdateNotification(input: SendClientUpdateNotificationInput): Promise<SendClientUpdateNotificationOutput> {
    return sendClientUpdateNotificationFlow(input);
}
