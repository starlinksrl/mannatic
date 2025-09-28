
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending password reset emails.
 *
 * - sendPasswordResetEmail - A function that generates and sends a password reset email.
 * - SendPasswordResetEmailInput - The input type for this function.
 * - SendPasswordResetEmailOutput - The return type for this function.
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

const SendPasswordResetEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the user.'),
  userName: z.string().describe('The name of the user.'),
  resetLink: z.string().url().describe('The password reset link.'),
  smtpConfig: SmtpConfigSchema.describe('SMTP server configuration for sending the email.'),
});
export type SendPasswordResetEmailInput = z.infer<typeof SendPasswordResetEmailInputSchema>;

const SendPasswordResetEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendPasswordResetEmailOutput = z.infer<typeof SendPasswordResetEmailOutputSchema>;

const prompt = ai.definePrompt({
  name: 'sendPasswordResetEmailPrompt',
  input: {schema: z.object({
      userName: SendPasswordResetEmailInputSchema.shape.userName,
      resetLink: SendPasswordResetEmailInputSchema.shape.resetLink,
  })},
  output: {schema: z.object({ emailSubject: z.string(), emailBody: z.string() }) },
  prompt: `You are an AI assistant for a business software called MannaTic. Your task is to generate a password reset email.

Generate a professional and clear subject and body for an email to be sent to a user who has requested to reset their password. The email must be in **Italian**.

User's Name: {{{userName}}}
Reset Link: {{{resetLink}}}

The email should:
1. Have a clear subject line like "Richiesta di Reset Password per MannaTic".
2. Greet the user by name.
3. State clearly that a password reset was requested for their account. If they did not make this request, they should ignore the email.
4. Provide the reset link and instruct them to click it to set a new password.
5. Mention that the link will expire in 1 hour.
6. End with a professional closing, like "Il Team di MannaTic".

Output a JSON object with "emailSubject" and "emailBody" fields. The emailBody should be in HTML format.
`,
});

const sendPasswordResetEmailFlow = ai.defineFlow(
  {
    name: 'sendPasswordResetEmailFlow',
    inputSchema: SendPasswordResetEmailInputSchema,
    outputSchema: SendPasswordResetEmailOutputSchema,
  },
  async (input) => {
    try {
      const { smtpConfig, ...promptInput } = input;
      
      console.log(`Generating password reset email for ${input.userName}...`);
      const { output } = await prompt(promptInput);

      if (!output || !output.emailBody || !output.emailSubject) {
          throw new Error('Failed to generate email content for password reset.');
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
      
      console.log(`Sending password reset email to ${input.recipientEmail} via ${smtpConfig.host}...`);

      await transporter.sendMail({
        from: smtpConfig.from,
        to: input.recipientEmail,
        subject: output.emailSubject,
        html: output.emailBody,
      });

      console.log('Password reset email sent successfully.');
      return { success: true };

    } catch (error: any) {
        console.error('Failed to send password reset email:', error);
        return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
    }
  }
);

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<SendPasswordResetEmailOutput> {
    return sendPasswordResetEmailFlow(input);
}
