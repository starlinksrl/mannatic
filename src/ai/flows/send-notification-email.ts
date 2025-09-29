// src/ai/flows/send-notification-email.ts
'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI agent for generating and sending maintenance notification emails.
 *
 * - sendNotificationEmail - A function that generates and sends a notification email for scheduled maintenance.
 * - SendNotificationEmailInput - The input type for the sendNotificationEmail function.
 * - SendNotificationEmailOutput - The return type for the sendNotificationEmail function.
 */


import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const SmtpConfigSchema = z.object({
  host: z.string().describe('SMTP server host.'),
  port: z.number().describe('SMTP server port.'),
  user: z.string().describe('SMTP username.'),
  pass: z.string().describe('SMTP password.'),
  from: z.string().email().describe('The sender\'s email address.'),
});

const SendNotificationEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the recipient.'),
  maintenanceDetails: z.string().describe('A brief description of the scheduled maintenance.'),
  nextDueDate: z.string().describe('The next due date for the maintenance.'),
  smtpConfig: SmtpConfigSchema.describe('SMTP server configuration for sending the email.'),
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
          <h1 style="color: #333;">Email di Prova per Configurazione SMTP</h1>
          <p>Questa è un'email di prova generata automaticamente da MannaTic per verificare la tua configurazione SMTP.</p>
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
    const { smtpConfig, recipientEmail, companyId } = input;

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465, // true for 465, false for other ports
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });
    
    console.log(`Sending static test email to ${recipientEmail} via ${smtpConfig.host}...`);

    const info = await transporter.sendMail({
      from: smtpConfig.from,
      to: recipientEmail,
      subject: emailSubject,
      html: emailBody,
    });

    console.log('Test email sent successfully.');
    
    await addDoc(collection(db, 'emailLogs'), {
      companyId,
      timestamp: new Date().toISOString(),
      recipient: recipientEmail,
      subject: emailSubject,
      status: 'success',
      response: info.response,
    });
    
    return { success: true, emailBody: emailBody };

  } catch (error: any) {
      console.error('Failed to send test email:', error);

      await addDoc(collection(db, 'emailLogs'), {
        companyId: input.companyId,
        timestamp: new Date().toISOString(),
        recipient: input.recipientEmail,
        subject: emailSubject,
        status: 'failure',
        response: error.response || 'N/A',
        error: error.message || 'An unknown error occurred.',
      });

      return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
  }
}
