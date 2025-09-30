
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for sending a test email to verify SMTP configuration.
 *
 * - sendTestEmail - A function that sends a test email.
 * - SendTestEmailInput - The input type for the sendTestEmail function.
 * - SendTestEmailOutput - The return type for the sendTestEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import nodemailer from 'nodemailer';
import type { SendTestEmailInput, SendTestEmailOutput } from '@/lib/types';
import { SendTestEmailInputSchema, SendTestEmailOutputSchema } from '@/lib/types';


export async function sendTestEmail(input: SendTestEmailInput): Promise<SendTestEmailOutput> {
  const emailSubject = 'MannaTic: Email di Prova SMTP';
  const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #333;">Email di Prova per Configurazione SMTP</h1>
          <p>Questa è un'email di prova generata automaticamente da MannaTic.</p>
          <p><b>Se stai leggendo questa email, le tue impostazioni SMTP di default sono corrette.</b></p>
      </div>
  `;

  try {
    const { smtpConfig, recipientEmail } = input;

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465, // true for 465, false for other ports
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    await transporter.sendMail({
      from: smtpConfig.from,
      to: recipientEmail,
      subject: emailSubject,
      html: emailBody,
    });
    
    return { success: true };

  } catch (error: any) {
      console.error('[sendTestEmail] FAILED:', error.message);
      return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
  }
}
