
'use server';
import 'dotenv/config';
/**
 * @fileOverview An agent for sending intervention reminder emails using Resend.
 *
 * - sendInterventionReminderEmail - A function that sends a reminder email to an operator.
 * - SendInterventionReminderEmailInput - The input type for the function.
 * - SendInterventionReminderEmailOutput - The return type for the function.
 */

import { Resend } from 'resend';
import type { SendInterventionReminderEmailInput, SendInterventionReminderEmailOutput } from '@/lib/types';


export async function sendInterventionReminderEmail(input: SendInterventionReminderEmailInput): Promise<SendInterventionReminderEmailOutput> {
    const { recipientEmail, operatorName, interventionId, interventionTitle, clientName, autologinUrl, resendConfig } = input;
    
    const emailSubject = `Sollecito: Compilazione Dettagli Intervento #${interventionId}`;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #333;">Sollecito di Compilazione</h1>
          <p>Ciao ${operatorName},</p>
          <p>Ti ricordiamo gentilmente di compilare i dettagli (ore di lavoro, materiali) per l'intervento completato:</p>
          <h2 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Dettagli Intervento</h2>
          <table style="width: 100%; border-collapse: collapse;">
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2; width: 150px;"><b>ID Intervento:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${interventionId}</td>
              </tr>
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Titolo:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${interventionTitle}</td>
              </tr>
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Cliente:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${clientName}</td>
              </tr>
          </table>
          <p style="margin-top: 20px;">
            Per favore, accedi alla piattaforma per completare i dati mancanti.
          </p>
          <p>
            <a href="${autologinUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">
                Vai all'Intervento
            </a>
          </p>
          <p>Grazie per la collaborazione.</p>
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

        return { success: true };

    } catch (error: any) {
        console.error('[sendInterventionReminderEmail] FAILED:', error.message);
        return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
    }
}
