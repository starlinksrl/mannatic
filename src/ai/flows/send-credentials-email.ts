
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending user credential emails.
 *
 * - sendCredentialsEmail - A function that generates and sends a user credential email.
 * - SendCredentialsEmailInput - The input type for this function.
 * - SendCredentialsEmailOutput - The return type for this function.
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

const SendCredentialsEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the user.'),
  userName: z.string().describe('The name of the user.'),
  userEmail: z.string().email().describe('The email used for login.'),
  userPassword: z.string().describe('The user\'s password.'),
  loginLink: z.string().url().describe('The direct link to the login page.'),
  smtpConfig: SmtpConfigSchema.describe('SMTP server configuration for sending the email.'),
  companyId: z.string().describe('The ID of the company.'),
});
export type SendCredentialsEmailInput = z.infer<typeof SendCredentialsEmailInputSchema>;

const SendCredentialsEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendCredentialsEmailOutput = z.infer<typeof SendCredentialsEmailOutputSchema>;

const prompt = ai.definePrompt({
  name: 'sendCredentialsEmailPrompt',
  input: {schema: z.object({
      userName: SendCredentialsEmailInputSchema.shape.userName,
      userEmail: SendCredentialsEmailInputSchema.shape.userEmail,
      userPassword: SendCredentialsEmailInputSchema.shape.userPassword,
      loginLink: SendCredentialsEmailInputSchema.shape.loginLink,
  })},
  output: {schema: z.object({ emailSubject: z.string(), emailBody: z.string() }) },
  prompt: `You are an AI assistant for a business software called MannaTic. Your task is to generate an email containing login credentials for a user.

Generate a professional and clear subject and body for the email. The email must be in **Italian**.

User's Name: {{{userName}}}
Login Email: {{{userEmail}}}
Password: {{{userPassword}}}
Login Link: {{{loginLink}}}

The email should:
1. Have a clear subject line like "Le tue credenziali di accesso a MannaTic".
2. Greet the user by name.
3. Clearly state their login email and password.
4. Provide the direct link to the login page.
5. End with a professional closing, like "Il Team di MannaTic".

Output a JSON object with "emailSubject" and "emailBody" fields. The emailBody should be in HTML format.
`,
});

const sendCredentialsEmailFlow = ai.defineFlow(
  {
    name: 'sendCredentialsEmailFlow',
    inputSchema: SendCredentialsEmailInputSchema,
    outputSchema: SendCredentialsEmailOutputSchema,
  },
  async (input) => {
    const { smtpConfig, recipientEmail, companyId, ...promptInput } = input;
    let emailSubject = `Credenziali di accesso per ${input.userName}`;
    try {
      const { output } = await prompt(promptInput);

      if (!output || !output.emailBody || !output.emailSubject) {
          throw new Error('Failed to generate email content for credentials.');
      }
      
      emailSubject = output.emailSubject;

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });

      await transporter.sendMail({
        from: smtpConfig.from,
        to: recipientEmail,
        subject: output.emailSubject,
        html: output.emailBody,
      });

      await addDoc(collection(db, 'emailLogs'), {
        companyId: companyId,
        timestamp: new Date().toISOString(),
        recipient: recipientEmail,
        subject: output.emailSubject,
        status: 'success',
      });

      return { success: true };

    } catch (error: any) {
        console.error(`[sendCredentialsEmailFlow] FAILED for ${recipientEmail}:`, error.message);

        await addDoc(collection(db, 'emailLogs'), {
            companyId: input.companyId,
            timestamp: new Date().toISOString(),
            recipient: input.recipientEmail,
            subject: emailSubject,
            status: 'failure',
            error: error.message || 'An unknown error occurred during email sending.',
        });

        return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
    }
  }
);

export async function sendCredentialsEmail(input: SendCredentialsEmailInput): Promise<SendCredentialsEmailOutput> {
    return sendCredentialsEmailFlow(input);
}
