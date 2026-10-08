
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending password reset emails using Resend.
 *
 * - sendPasswordResetEmail - A function that generates and sends a password reset email.
 * - SendPasswordResetEmailInput - The input type for this function.
 * - SendPasswordResetEmailOutput - The return type for this function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { Resend } from 'resend';
import { sendEmail } from '@/lib/mailer';

const ResendConfigSchema = z.object({
  apiKey: z.string().describe('Resend API key.'),
  from: z.string().email().describe("The sender's email address."),
});

const SendPasswordResetEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the user.'),
  userName: z.string().describe('The name of the user.'),
  resetLink: z.string().url().describe('The password reset link.'),
  resendConfig: ResendConfigSchema.describe('Resend configuration for sending the email.'),
  companyId: z.string().describe('The ID of the company.'),
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
    const { resendConfig, recipientEmail, companyId, ...promptInput } = input;
    let emailSubject = `Richiesta di Reset Password per MannaTic`;
    let emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #0284c7; margin-top: 0;">Reimpostazione Password MannaTic</h2>
        <p>Gentile <strong>${input.userName}</strong>,</p>
        <p>Abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account su <strong>MannaTic</strong>.</p>
        <p>Per impostare una nuova password, clicca sul pulsante qui sotto:</p>
        <p style="margin: 25px 0;">
          <a href="${input.resetLink}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reimposta Password
          </a>
        </p>
        <p style="font-size: 13px; color: #666;">
          Se il pulsante non funziona, copia e incolla questo link nel browser:<br />
          <a href="${input.resetLink}" style="color: #0284c7;">${input.resetLink}</a>
        </p>
        <p style="font-size: 13px; color: #888;">
          Questo link è valido per 1 ora. Se non hai richiesto tu il reset, puoi ignorare questa email in sicurezza.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #aaa;">Il Team di MannaTic</p>
      </div>
    `;

    try {
      if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
        try {
          const { output } = await prompt(promptInput);
          if (output?.emailBody && output?.emailSubject) {
            emailSubject = output.emailSubject;
            emailBody = output.emailBody;
          }
        } catch (promptErr: any) {
          console.warn('[sendPasswordResetEmailFlow] AI prompt skipped/failed, using standard template:', promptErr.message);
        }
      }

      const result = await sendEmail({
        to: recipientEmail,
        subject: emailSubject,
        html: emailBody,
        resendConfig,
      });

      if (!result.success) {
        throw new Error(result.error || 'Invio email fallito.');
      }

      return { success: true };

    } catch (error: any) {
        console.error(`[sendPasswordResetEmailFlow] FAILED for ${recipientEmail}:`, error.message);
        return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
    }
  }
);

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<SendPasswordResetEmailOutput> {
    return sendPasswordResetEmailFlow(input);
}

