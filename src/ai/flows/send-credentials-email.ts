
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
import { Resend } from 'resend';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const ResendConfigSchema = z.object({
  apiKey: z.string().describe('Resend API key.'),
  from: z.string().email().describe("The sender's email address."),
});

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
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1 style="color: #333;">Credenziali di Accesso a MannaTic</h1>
        <p>Ciao ${userName},</p>
        <p>Ecco le tue credenziali per accedere alla piattaforma MannaTic:</p>
        <ul style="list-style-type: none; padding: 0;">
            <li style="margin-bottom: 10px;"><strong>Email:</strong> ${userEmail}</li>
            <li style="margin-bottom: 10px;"><strong>Password:</strong> ${userPassword}</li>
        </ul>
        <p>Puoi accedere direttamente dal seguente link:</p>
        <p><a href="${loginLink}" style="background-color: #64B5F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accedi a MannaTic</a></p>
        <br>
        <p>Cordiali saluti,<br>Il Team di MannaTic</p>
    </div>
  `;

  try {
    const resend = new Resend(resendConfig.apiKey);

    const { data, error } = await resend.emails.send({
      from: resendConfig.from,
      to: [recipientEmail],
      subject: emailSubject,
      html: emailBody,
    });

    if (error) {
      throw error;
    }

    await addDoc(collection(db, 'emailLogs'), {
      companyId: companyId,
      timestamp: new Date().toISOString(),
      recipient: recipientEmail,
      subject: emailSubject,
      status: 'success',
    });

    return { success: true };

  } catch (error: any) {
    console.error(`[sendCredentialsEmail] FAILED for ${recipientEmail}:`, error.message);

    await addDoc(collection(db, 'emailLogs'), {
        companyId: companyId,
        timestamp: new Date().toISOString(),
        recipient: recipientEmail,
        subject: emailSubject,
        status: 'failure',
        error: error.message || 'An unknown error occurred during email sending.',
    });

    return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
  }
}
