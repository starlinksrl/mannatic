
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending new intervention notification emails.
 *
 * - sendNewInterventionNotification - A function that generates and sends a notification email for a new intervention.
 * - SendNewInterventionNotificationInput - The input type for the sendNewInterventionNotification function.
 * - SendNewInterventionNotificationOutput - The return type for the sendNewInterventionNotification function.
 */


import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const SmtpConfigSchema = z.object({
  host: z.string().describe('SMTP server host.'),
  port: z.number().describe('SMTP server port.'),
  user: z.string().describe('SMTP username.'),
  pass: z.string().describe('SMTP password.'),
  from: z.string().email().describe('The sender\'s email address.'),
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
  smtpConfig: SmtpConfigSchema.describe('SMTP server configuration for sending the email.'),
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
    const { smtpConfig, recipientEmail, companyId, ...promptInput } = input;
    const emailSubject = `Nuovo Intervento #${promptInput.interventionId} (${promptInput.creatorName} per ${promptInput.clientName})`;
    const formattedDueDate = promptInput.interventionDueDate 
      ? format(new Date(promptInput.interventionDueDate), 'dd/MM/yyyy', { locale: it }) 
      : 'Non specificata';

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
          <p style="margin-top: 20px;">Puoi visualizzare tutti i dettagli accedendo alla dashboard di MannaTic.</p>
      </div>
    `;

    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
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

      await addDoc(collection(db, 'emailLogs'), {
        companyId: companyId,
        timestamp: new Date().toISOString(),
        recipient: recipientEmail,
        subject: emailSubject,
        status: 'success',
      });

      return { success: true, emailBody: emailBody };

    } catch (error: any) {
        console.error('[sendNewInterventionNotification] FAILED:', error.message);

        await addDoc(collection(db, 'emailLogs'), {
            companyId: companyId,
            timestamp: new Date().toISOString(),
            recipient: recipientEmail,
            subject: emailSubject,
            status: 'failure',
            error: error.message || 'An unknown error occurred.',
        });

        return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
    }
}

    