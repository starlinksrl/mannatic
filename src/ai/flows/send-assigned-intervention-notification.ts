
'use server';
import 'dotenv/config';
/**
 * @fileOverview An agent for sending new intervention assignment notification emails using Resend.
 *
 * - sendAssignedInterventionNotification - A function that sends a notification email for a new assignment.
 * - SendAssignedInterventionNotificationInput - The input type for the function.
 * - SendAssignedInterventionNotificationOutput - The return type for the function.
 */

import { Resend } from 'resend';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { SendAssignedInterventionNotificationInput, SendAssignedInterventionNotificationOutput } from '@/lib/types';


export async function sendAssignedInterventionNotification(input: SendAssignedInterventionNotificationInput): Promise<SendAssignedInterventionNotificationOutput> {
    const { resendConfig, recipientEmail, ...promptInput } = input;
    const emailSubject = `Nuovo Intervento Assegnato: #${promptInput.interventionId} per ${promptInput.clientName}`;
    const formattedDueDate = promptInput.interventionDueDate
      ? format(new Date(promptInput.interventionDueDate), 'dd/MM/yyyy HH:mm', { locale: it })
      : 'Non specificata';

    const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #333;">Ti è stato assegnato un nuovo intervento</h1>
          <p>Ciao, <b>${promptInput.assignerName}</b> ti ha assegnato un intervento su MannaTic.</p>
          <h2 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Dettagli Intervento</h2>
          <table style="width: 100%; border-collapse: collapse;">
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2; width: 150px;"><b>ID Intervento:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${promptInput.interventionId}</td>
              </tr>
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Titolo:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${promptInput.interventionTitle}</td>
              </tr>
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Cliente:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${promptInput.clientName}</td>
              </tr>
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Priorità:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${promptInput.interventionPriority}</td>
              </tr>
               <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Scadenza:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${formattedDueDate}</td>
              </tr>
          </table>
          <p style="margin-top: 20px;">Puoi visualizzare tutti i dettagli e avviare il lavoro accedendo alla dashboard di MannaTic.</p>
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
        console.error('[sendAssignedInterventionNotification] FAILED:', error.message);
        return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
    }
}
