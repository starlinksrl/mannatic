// src/ai/flows/send-notification-email.ts
'use server';

/**
 * @fileOverview An AI agent for generating and sending maintenance notification emails.
 *
 * - sendNotificationEmail - A function that generates and sends a notification email for scheduled maintenance.
 * - SendNotificationEmailInput - The input type for the sendNotificationEmail function.
 * - SendNotificationEmailOutput - The return type for the sendNotificationEmail function.
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

const SendNotificationEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the recipient.'),
  maintenanceDetails: z.string().describe('A brief description of the scheduled maintenance.'),
  nextDueDate: z.string().describe('The next due date for the maintenance.'),
  smtpConfig: SmtpConfigSchema.describe('SMTP server configuration for sending the email.'),
});
export type SendNotificationEmailInput = z.infer<typeof SendNotificationEmailInputSchema>;

const SendNotificationEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  emailBody: z.string().optional().describe('The generated body of the email.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendNotificationEmailOutput = z.infer<typeof SendNotificationEmailOutputSchema>;


export async function sendNotificationEmail(input: SendNotificationEmailInput): Promise<SendNotificationEmailOutput> {
  return sendNotificationEmailFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sendNotificationEmailPrompt',
  input: {schema: z.object({
      recipientEmail: SendNotificationEmailInputSchema.shape.recipientEmail,
      maintenanceDetails: SendNotificationEmailInputSchema.shape.maintenanceDetails,
      nextDueDate: SendNotificationEmailInputSchema.shape.nextDueDate,
  })},
  output: {schema: z.object({ emailSubject: z.string(), emailBody: z.string() }) },
  prompt: `You are an AI assistant tasked with generating professional email notifications for scheduled maintenance tasks.

Generate the subject and body of an email to be sent to {{{recipientEmail}}}.

The email should be a friendly but professional reminder about an upcoming scheduled maintenance.

Maintenance Details: {{{maintenanceDetails}}}
Next Due Date: {{{nextDueDate}}}

The email should:
1. Have a clear subject line like "Promemoria Manutenzione Programmata".
2. Clearly state the maintenance task and its due date.
3. Be written in Italian.
4. Be concise and to the point.
5. End with a polite closing.

Output a JSON object with "emailSubject" and "emailBody" fields. Do not include "To:" in the body.
`,
});

const sendNotificationEmailFlow = ai.defineFlow(
  {
    name: 'sendNotificationEmailFlow',
    inputSchema: SendNotificationEmailInputSchema,
    outputSchema: SendNotificationEmailOutputSchema,
  },
  async (input) => {
    try {
      const { smtpConfig, ...promptInput } = input;
      
      console.log(`Generating email content for ${input.recipientEmail}...`);
      const { output } = await prompt(promptInput);

      if (!output || !output.emailBody || !output.emailSubject) {
          throw new Error('Failed to generate email content.');
      }
      
      console.log(`Generated email body for ${input.recipientEmail}: \n${output.emailBody}`);

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465, // true for 465, false for other ports
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });
      
      console.log(`Sending email to ${input.recipientEmail} via ${smtpConfig.host}...`);

      await transporter.sendMail({
        from: smtpConfig.from,
        to: input.recipientEmail,
        subject: output.emailSubject,
        html: output.emailBody,
      });

      console.log('Email sent successfully.');
      return { success: true, emailBody: output.emailBody };

    } catch (error: any) {
        console.error('Failed to send email:', error);
        return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
    }
  }
);
