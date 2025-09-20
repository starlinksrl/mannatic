'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending new intervention notification emails.
 *
 * - sendNewInterventionNotification - A function that generates and sends a notification email for a new intervention.
 * - SendNewInterventionNotificationInput - The input type for the sendNewInterventionNotification function.
 * - SendNewInterventionNotificationOutput - The return type for the sendNewInterventionNotification function.
 */


import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import nodemailer from 'nodemailer';

const SmtpConfigSchema = z.object({
  host: z.string().describe('SMTP server host.'),
  port: z.number().describe('SMTP server port.'),
  user: z.string().describe('SMTP username.'),
  pass: z.string().describe('SMTP password.'),
  from: z.string().email().describe('The sender\'s email address.'),
});

const SendNewInterventionNotificationInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the recipient (admin).'),
  interventionId: z.string().describe('The ID of the new intervention.'),
  interventionTitle: z.string().describe('The title of the new intervention.'),
  clientName: z.string().describe('The name of the client for the intervention.'),
  creatorName: z.string().describe('The name of the user who created the intervention.'),
  smtpConfig: SmtpConfigSchema.describe('SMTP server configuration for sending the email.'),
});
export type SendNewInterventionNotificationInput = z.infer<typeof SendNewInterventionNotificationInputSchema>;

const SendNewInterventionNotificationOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  emailBody: z.string().optional().describe('The generated body of the email.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendNewInterventionNotificationOutput = z.infer<typeof SendNewInterventionNotificationOutputSchema>;


const prompt = ai.definePrompt({
  name: 'sendNewInterventionNotificationPrompt',
  input: {schema: z.object({
      interventionId: SendNewInterventionNotificationInputSchema.shape.interventionId,
      interventionTitle: SendNewInterventionNotificationInputSchema.shape.interventionTitle,
      clientName: SendNewInterventionNotificationInputSchema.shape.clientName,
      creatorName: SendNewInterventionNotificationInputSchema.shape.creatorName,
  })},
  output: {schema: z.object({ emailSubject: z.string(), emailBody: z.string() }) },
  prompt: `You are an AI assistant tasked with generating professional email notifications for newly created maintenance interventions.

Generate the subject and body of an email to be sent to a company administrator.

The email should inform the admin that a new intervention has been created.

Intervention ID: {{{interventionId}}}
Title: {{{interventionTitle}}}
Client: {{{clientName}}}
Created by: {{{creatorName}}}

The email should:
1. Have a clear and informative subject line like "Nuovo Intervento Creato: #{{{interventionId}}}".
2. Clearly state the new intervention details (ID, title, client, creator).
3. Be written in Italian.
4. Have a professional and informative tone.
5. End with a polite closing.

Output a JSON object with "emailSubject" and "emailBody" fields. Do not include "To:" in the body.
`,
});

const sendNewInterventionNotificationFlow = ai.defineFlow(
  {
    name: 'sendNewInterventionNotificationFlow',
    inputSchema: SendNewInterventionNotificationInputSchema,
    outputSchema: SendNewInterventionNotificationOutputSchema,
  },
  async (input) => {
    try {
      const { smtpConfig, ...promptInput } = input;
      
      console.log(`Generating new intervention email for admin...`);
      const { output } = await prompt(promptInput);

      if (!output || !output.emailBody || !output.emailSubject) {
          throw new Error('Failed to generate email content for new intervention notification.');
      }
      
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });
      
      console.log(`Sending new intervention email to ${input.recipientEmail} via ${smtpConfig.host}...`);

      await transporter.sendMail({
        from: smtpConfig.from,
        to: input.recipientEmail,
        subject: output.emailSubject,
        html: output.emailBody,
      });

      console.log('New intervention email sent successfully.');
      return { success: true, emailBody: output.emailBody };

    } catch (error: any) {
        console.error('Failed to send new intervention email:', error);
        return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
    }
  }
);

export async function sendNewInterventionNotification(input: SendNewInterventionNotificationInput): Promise<SendNewInterventionNotificationOutput> {
    return sendNewInterventionNotificationFlow(input);
}
