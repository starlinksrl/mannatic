

'use server';
import 'dotenv/config';

import { generateKpiDashboard, GenerateKpiDashboardInput, GenerateKpiDashboardOutput } from '@/ai/flows/generate-kpi-dashboard';
import { sendNotificationEmail, SendNotificationEmailInput, SendNotificationEmailOutput } from '@/ai/flows/send-notification-email';
import { sendExpiryNotification, SendExpiryNotificationInput, SendExpiryNotificationOutput } from '@/ai/flows/send-expiry-notification';
import { sendNewInterventionNotification, SendNewInterventionNotificationInput } from '@/ai/flows/send-new-intervention-notification';
import { sendPasswordResetEmail, SendPasswordResetEmailInput } from '@/ai/flows/send-password-reset-email';
import { updateCompany, resetUserPassword, getUserByEmail, createPasswordResetToken, getCompanyByUserId, getEmailLogs } from '@/lib/data';
import { Company, EmailLog } from '@/lib/types';
import type { SendNewInterventionNotificationOutput } from '@/ai/flows/send-new-intervention-notification';
import nodemailer from 'nodemailer';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function getKpiDashboardDescription(input: GenerateKpiDashboardInput): Promise<GenerateKpiDashboardOutput> {
  try {
    const result = await generateKpiDashboard(input);
    return result;
  } catch (error) {
    console.error("Error generating KPI dashboard description:", error);
    return { dashboardDescription: "Impossibile generare la descrizione della dashboard in questo momento. Si è verificato un errore." };
  }
}

export async function sendTestEmail(input: SendNotificationEmailInput): Promise<SendNotificationEmailOutput> {
  try {
    const result = await sendNotificationEmail(input);
    return result;
  } catch (error: any) {
    console.error("Error sending test email:", error);
    return { success: false, error: error.message || "An unknown error occurred." };
  }
}

interface SendClientUpdateEmailInput {
  recipientEmail: string;
  clientName: string;
  interventionId: string;
  interventionTitle: string;
  interventionStatus: string;
  updateMessage: string;
  interventionLink: string;
  company: Company;
}

export async function sendClientUpdateEmail(input: SendClientUpdateEmailInput): Promise<{ success: boolean; error?: string }> {
  const { recipientEmail, clientName, interventionId, interventionTitle, interventionStatus, updateMessage, interventionLink, company } = input;

  const isCreation = updateMessage === 'creato';
  const emailSubject = isCreation
    ? `Conferma Creazione Intervento #${interventionId}`
    : `Aggiornamento Intervento #${interventionId}: ${interventionTitle}`;

  const emailBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h3>Gentile ${clientName},</h3>
      <p>La informiamo che c'è un aggiornamento riguardo il suo intervento di manutenzione.</p>
      <hr>
      <p><b>ID Intervento:</b> ${interventionId}</p>
      <p><b>Titolo:</b> ${interventionTitle}</p>
      <p><b>Stato:</b> ${interventionStatus}</p>
      <p><b>Dettaglio:</b> ${updateMessage}</p>
      <br>
      <a href="${interventionLink}" style="background-color: #64B5F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visualizza Dettagli Intervento</a>
      <br>
      <p>Cordiali saluti,<br>Il Team di MannaTic</p>
    </div>
  `;

  console.log(`[sendClientUpdateEmail] START for intervention #${interventionId} to ${recipientEmail} for company ${company.id}.`);
  try {
    if (!company.smtpHost || !company.senderEmail) {
      throw new Error('La configurazione SMTP per questa azienda è incompleta.');
    }
    
    const transporter = nodemailer.createTransport({
      host: company.smtpHost,
      port: company.smtpPort,
      secure: company.smtpPort === 465,
      auth: {
        user: company.smtpUser,
        pass: company.smtpPass,
      },
    });

    await transporter.sendMail({
      from: company.senderEmail,
      to: recipientEmail,
      subject: emailSubject,
      html: emailBody,
    });

    console.log(`[sendClientUpdateEmail] Email sent successfully to ${recipientEmail}.`);

    await addDoc(collection(db, 'emailLogs'), {
      companyId: company.id,
      timestamp: new Date().toISOString(),
      recipient: recipientEmail,
      subject: emailSubject,
      status: 'success',
    });

    return { success: true };

  } catch (error: any) {
    console.error(`[sendClientUpdateEmail] FAILED for ${recipientEmail}:`, error.message);

    await addDoc(collection(db, 'emailLogs'), {
      companyId: company.id,
      timestamp: new Date().toISOString(),
      recipient: recipientEmail,
      subject: emailSubject,
      status: 'failure',
      error: error.message || 'An unknown error occurred.',
    });

    return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
  }
}


export async function saveSmtpSettings(companyId: string, settings: Partial<Company>): Promise<Company | null> {
    try {
        const result = await updateCompany(companyId, settings);
        return result;
    } catch (error: any) {
        console.error("Error saving SMTP settings:", error);
        return null;
    }
}

export async function triggerExpiryNotification(input: SendExpiryNotificationInput): Promise<SendExpiryNotificationOutput> {
    try {
        const result = await sendExpiryNotification(input);
        return result;
    } catch (error: any) {
        console.error("Error sending expiry notification email:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function triggerNewInterventionNotification(input: SendNewInterventionNotificationInput): Promise<SendNewInterventionNotificationOutput> {
    try {
        const result = await sendNewInterventionNotification(input);
        return result;
    } catch (error: any) {
        console.error("Error sending new intervention notification email:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function handlePasswordResetRequest(email: string): Promise<{ success: boolean, message: string }> {
    try {
        const user = await getUserByEmail(email);
        if (!user) {
            // Don't reveal if user exists or not for security reasons
            return { success: true, message: "If an account with this email exists, a reset link will be sent." };
        }

        const company = await getCompanyByUserId(user.id);
        if (!company || !company.smtpHost || !company.senderEmail) {
            return { success: false, message: "La configurazione per l'invio email non è completa. Contattare l'amministratore." };
        }

        const token = await createPasswordResetToken(user.id);
        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

        await sendPasswordResetEmail({
            recipientEmail: user.email,
            userName: user.name,
            resetLink,
            companyId: company.id,
            smtpConfig: {
                host: company.smtpHost,
                port: company.smtpPort!,
                user: company.smtpUser!,
                pass: company.smtpPass!,
                from: company.senderEmail,
            }
        });

        return { success: true, message: "Se un account con questa email esiste, un link di reset è stato inviato." };

    } catch (error: any) {
        console.error("Error in password reset request:", error);
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}

export async function handlePasswordReset(token: string, newPassword: string):Promise<{ success: boolean, message: string }> {
    try {
        const result = await resetUserPassword(token, newPassword);
        return result;
    } catch (error: any) {
        console.error("Error resetting password:", error);
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}

export async function fetchEmailLogs(companyId: string): Promise<EmailLog[]> {
    try {
        const logs = await getEmailLogs(companyId);
        return logs;
    } catch (error) {
        console.error("Error fetching email logs:", error);
        return [];
    }
}

    
