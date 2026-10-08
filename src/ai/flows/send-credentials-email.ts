
'use server';
import 'dotenv/config';
/**
 * @fileOverview An agent for sending user credential emails using Resend.
 *
 * - sendCredentialsEmail - A function that sends a user credential email.
 * - SendCredentialsEmailInput - The input type for this function.
 * - SendCredentialsEmailOutput - The return type for this function.
 */

import { z } from 'zod';
import { sendEmail } from '@/lib/mailer';


const ResendConfigSchema = z.object({
  apiKey: z.string().optional().describe('Resend API key.'),
  from: z.string().optional().describe("The sender's email address."),
}).optional();

const SendCredentialsEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the user.'),
  userName: z.string().describe('The name of the user.'),
  userEmail: z.string().email().describe('The email used for login.'),
  userPassword: z.string().describe("The user's password."),
  loginLink: z.string().url().describe('The direct link to the login page.'),
  resendConfig: ResendConfigSchema.describe('Resend configuration for sending the email.'),
  companyId: z.string().describe('The ID of the company.'),
});
export type SendCredentialsEmailInput = z.infer<typeof SendCredentialsEmailInputSchema>;

const SendCredentialsEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendCredentialsEmailOutput = z.infer<typeof SendCredentialsEmailOutputSchema>;

export async function sendCredentialsEmail(input: SendCredentialsEmailInput): Promise<SendCredentialsEmailOutput> {
  const { resendConfig, recipientEmail, userName, userEmail, userPassword, loginLink, companyId } = input;

  const emailSubject = "Le tue credenziali di accesso a MannaTic";
  const emailBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #0284c7; margin-top: 0;">Credenziali di Accesso a MannaTic</h2>
        <p>Gentile <strong>${userName}</strong>,</p>
        <p>Ecco le tue credenziali per accedere alla piattaforma MannaTic:</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> ${userPassword}</p>
        </div>
        <p style="margin: 25px 0;">
          <a href="${loginLink}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Accedi a MannaTic
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">Il Team di MannaTic</p>
    </div>
  `;

  try {
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
    console.error(`[sendCredentialsEmail] FAILED for ${recipientEmail}:`, error.message);
    return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
  }
}
