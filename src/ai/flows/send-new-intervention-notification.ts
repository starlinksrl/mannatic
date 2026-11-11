
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending new intervention notification emails using Resend.
 *
 * - sendNewInterventionNotification - A function that generates and sends a notification email for a new intervention.
 * - SendNewInterventionNotificationInput - The input type for the sendNewInterventionNotification function.
 * - SendNewInterventionNotificationOutput - The return type for the sendNewInterventionNotification function.
 */

import {z} from 'genkit';
import { sendEmail } from '@/lib/mailer';
import { resolvePlatformBaseUrl } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const ResendConfigSchema = z.object({
  apiKey: z.string().describe('Resend API key.'),
  from: z.string().email().describe("The sender's email address."),
});

const SendNewInterventionNotificationInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the recipient (admin).'),
  interventionId: z.string().describe('The ID of the new intervention.'),
  interventionTitle: z.string().describe('The title of the new intervention.'),
  interventionDescription: z.string().optional().describe('The description of the new intervention.'),
  interventionPriority: z.string().describe('The priority of the new intervention.'),
  interventionDueDate: z.string().optional().describe('The due date of the new intervention.'),
  clientName: z.string().describe('The name of the client for the intervention.'),
  creatorName: z.string().describe('The name of the user who created the intervention.'),
  assignedOperatorName: z.string().optional().describe('The name of the assigned operator.'),
  resendConfig: ResendConfigSchema.describe('Resend configuration for sending the email.'),
  companyId: z.string().describe('The ID of the company.'),
});
export type SendNewInterventionNotificationInput = z.infer<typeof SendNewInterventionNotificationInputSchema>;

const SendNewInterventionNotificationOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  emailBody: z.string().optional().describe('The generated body of the email.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendNewInterventionNotificationOutput = z.infer<typeof SendNewInterventionNotificationOutputSchema>;


export async function sendNewInterventionNotification(input: SendNewInterventionNotificationInput): Promise<SendNewInterventionNotificationOutput> {
    const { resendConfig, recipientEmail, companyId, ...promptInput } = input;
    const emailSubject = `Nuovo Intervento #${promptInput.interventionId} (${promptInput.creatorName} per ${promptInput.clientName})`;
    const formattedDueDate = promptInput.interventionDueDate 
      ? format(new Date(promptInput.interventionDueDate), 'dd/MM/yyyy', { locale: it }) 
      : 'Non specificata';
    const baseUrl = resolvePlatformBaseUrl();
    const interventionUrl = `${baseUrl}/dashboard/interventions?search=${encodeURIComponent(promptInput.interventionId)}`;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #333;">Nuovo Intervento Creato</h1>
          <p>Un nuovo intervento è stato creato nel sistema MannaTic.</p>
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
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Descrizione:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${promptInput.interventionDescription || 'Non specificata'}</td>
              </tr>
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Cliente:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${promptInput.clientName}</td>
              </tr>
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Creato da:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${promptInput.creatorName}</td>
              </tr>
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Priorità:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${promptInput.interventionPriority}</td>
              </tr>
               <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Scadenza:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${formattedDueDate}</td>
              </tr>
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><b>Operatore:</b></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${promptInput.assignedOperatorName || 'Non assegnato'}</td>
              </tr>
          </table>
          <p style="margin-top: 20px;">
            <a href="${interventionUrl}" style="background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Visualizza Intervento su MannaTic
            </a>
          </p>
      </div>
    `;

    try {
      const result = await sendEmail({
        to: recipientEmail,
        subject: emailSubject,
        html: emailBody,
        resendConfig: resendConfig?.apiKey && resendConfig?.from ? resendConfig : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Invio email fallito.');
      }

      return { success: true, emailBody: emailBody };

    } catch (error: any) {
        console.error('[sendNewInterventionNotification] FAILED:', error.message);
        return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
    }
}
