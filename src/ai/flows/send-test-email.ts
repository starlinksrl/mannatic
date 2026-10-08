
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for sending a test email to verify Resend configuration.
 *
 * - sendTestEmail - A function that sends a test email.
 * - SendTestEmailInput - The input type for the sendTestEmail function.
 * - SendTestEmailOutput - The return type for the sendTestEmail function.
 */

import type { SendTestEmailInput, SendTestEmailOutput } from '@/lib/types';
import { sendEmail } from '@/lib/mailer';

export async function sendTestEmail(input: SendTestEmailInput): Promise<SendTestEmailOutput> {
  const isResend = Boolean(input.resendConfig?.apiKey);
  const emailSubject = isResend ? 'MannaTic: Email di Prova Resend' : 'MannaTic: Email di Prova (Dominio mannatec.it)';
  const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">MannaTic - Test Invio Email Riuscito</h2>
          <p style="color: #334155; font-size: 15px;">Questa è un'email di prova generata dal sistema gestionale <strong>MannaTic</strong>.</p>
          <div style="background-color: #f0fdf4; padding: 14px 18px; border-radius: 6px; border-left: 4px solid #10b981; margin: 18px 0;">
            <p style="margin: 0; font-size: 14px; color: #166534;"><strong>Metodo di Invio:</strong> ${isResend ? 'Resend API personalizzato' : 'Server SMTP Dominio (mail.mannatec.it)'}</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #166534;"><strong>Mittente:</strong> ${input.resendConfig?.from || 'noreply@mannatec.it'}</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #166534;"><strong>Porta:</strong> ${isResend ? 'HTTPS 443' : 'SMTP 465 (SSL/TLS)'}</p>
          </div>
          <p style="color: #475569; font-size: 14px;">Se stai leggendo questo messaggio, il recapito delle email (credenziali, notifiche ticket, riepiloghi e report) è perfettamente operativo.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">MannaTic Platform &bull; mannatec.it</p>
      </div>
  `;

  try {
    const { resendConfig, recipientEmail } = input;
    const result = await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailBody,
      text: `MannaTic - Test Invio Email Riuscito tramite ${isResend ? 'Resend' : 'mail.mannatec.it'}`,
      resendConfig: resendConfig?.apiKey ? { apiKey: resendConfig.apiKey, from: resendConfig.from } : undefined,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Invio email fallito.' };
    }
    return { success: true };
  } catch (error: any) {
    console.error('[sendTestEmail] FAILED:', error.message);
    return { success: false, error: error.message || 'Errore durante l\'invio dell\'email di prova.' };
  }
}
