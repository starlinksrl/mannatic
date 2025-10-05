
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for sending a test email to verify Resend configuration.
 *
 * - sendTestEmail - A function that sends a test email.
 * - SendTestEmailInput - The input type for the sendTestEmail function.
 * - SendTestEmailOutput - The return type for the sendTestEmail function.
 */

import {z} from 'genkit';
import { Resend } from 'resend';
import type { SendTestEmailInput, SendTestEmailOutput } from '@/lib/types';

export async function sendTestEmail(input: SendTestEmailInput): Promise<SendTestEmailOutput> {
  const emailSubject = 'MannaTic: Email di Prova Resend';
  const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #333;">Email di Prova per Configurazione Resend</h1>
          <p>Questa è un'email di prova generata automaticamente da MannaTic.</p>
          <p><b>Se stai leggendo questa email, la tua configurazione Resend è corretta.</b></p>
      </div>
  `;

  try {
    const { resendConfig, recipientEmail } = input;
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
    
    return { success: true };

  } catch (error: any) {
      console.error('[sendTestEmail] FAILED:', error.message);
      return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
  }
}
