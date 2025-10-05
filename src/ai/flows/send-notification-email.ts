
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending maintenance notification emails using Resend.
 *
 * - sendNotificationEmail - A function that generates and sends a notification email for scheduled maintenance.
 * - SendNotificationEmailInput - The input type for the sendNotificationEmail function.
 * - SendNotificationEmailOutput - The return type for the sendNotificationEmail function.
 */

import {z} from 'genkit';
import { Resend } from 'resend';

const ResendConfigSchema = z.object({
  apiKey: z.string().describe('Resend API key.'),
  from: z.string().email().describe("The sender's email address."),
});

const SendNotificationEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the recipient.'),
  maintenanceDetails: z.string().describe('A brief description of the scheduled maintenance.'),
  nextDueDate: z.string().describe('The next due date for the maintenance.'),
  resendConfig: ResendConfigSchema.describe('Resend configuration for sending the email.'),
  companyId: z.string().describe('The ID of the company.'),
});
export type SendNotificationEmailInput = z.infer<typeof SendNotificationEmailInputSchema>;

const SendNotificationEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  emailBody: z.string().optional().describe('The generated body of the email.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendNotificationEmailOutput = z.infer<typeof SendNotificationEmailOutputSchema>;


export async function sendNotificationEmail(input: SendNotificationEmailInput): Promise<SendNotificationEmailOutput> {
  const emailSubject = 'Test Email da MannaTic';
  const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #333;">Email di Prova per Configurazione Resend</h1>
          <p>Questa è un'email di prova generata automaticamente da MannaTic per verificare la tua configurazione di Resend.</p>
          <p><b>Se stai leggendo questa email, le tue impostazioni sono corrette e il sistema è in grado di inviare notifiche.</b></p>
          <hr>
          <p style="font-size: 0.9em; color: #555;">I dati sottostanti sono solo a scopo di esempio e non corrispondono a dati reali:</p>
          <ul>
              <li><b>Dettagli Manutenzione di Esempio:</b> ${input.maintenanceDetails}</li>
              <li><b>Data Scadenza di Esempio:</b> ${input.nextDueDate}</li>
          </ul>
      </div>
  `;

  try {
    const { resendConfig, recipientEmail, companyId } = input;
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
    
    return { success: true, emailBody: emailBody };

  } catch (error: any) {
      console.error('[sendNotificationEmail] FAILED:', error.message);
      return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
  }
}
