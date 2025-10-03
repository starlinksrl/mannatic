

'use server';
import 'dotenv/config';

import { generateKpiDashboard, GenerateKpiDashboardInput, GenerateKpiDashboardOutput } from '@/ai/flows/generate-kpi-dashboard';
import { sendNotificationEmail } from '@/ai/flows/send-notification-email';
import { sendExpiryNotification } from '@/ai/flows/send-expiry-notification';
import { sendNewInterventionNotification } from '@/ai/flows/send-new-intervention-notification';
import { sendPasswordResetEmail } from '@/ai/flows/send-password-reset-email';
import { sendCredentialsEmail } from '@/ai/flows/send-credentials-email';
import { sendTestEmail } from '@/ai/flows/send-test-email';
import { testGcsConnection as testGcsConnectionFlow } from '@/ai/flows/test-gcs-connection';
import { fetchFileFromGcs as fetchFileFromGcsFlow } from '@/ai/flows/fetch-file-from-gcs';
import { updateCompany, getUserByEmail, createPasswordResetToken, getCompanyByUserId, getEmailLogs, resetUserPassword, getUserById } from '@/lib/data';
import { Company, EmailLog, User } from '@/lib/types';
import nodemailer from 'nodemailer';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SendNotificationEmailInput, SendNotificationEmailOutput } from '@/ai/flows/send-notification-email';
import type { SendExpiryNotificationInput, SendExpiryNotificationOutput } from '@/ai/flows/send-expiry-notification';
import type { SendNewInterventionNotificationInput, SendNewInterventionNotificationOutput } from '@/ai/flows/send-new-intervention-notification';
import type { SendPasswordResetEmailInput, SendPasswordResetEmailOutput } from '@/ai/flows/send-password-reset-email';
import type { SendCredentialsEmailInput, SendCredentialsEmailOutput } from '@/ai/flows/send-credentials-email';
import type { SendTestEmailInput, SendTestEmailOutput, TestGcsConnectionInput, TestGcsConnectionOutput, FetchFileFromGcsInput, FetchFileFromGcsOutput } from '@/lib/types';

export async function getKpiDashboardDescription(input: GenerateKpiDashboardInput): Promise<GenerateKpiDashboardOutput> {
  try {
    const result = await generateKpiDashboard(input);
    return result;
  } catch (error) {
    console.error("Error generating KPI dashboard description:", error);
    return { dashboardDescription: "Impossibile generare la descrizione della dashboard in questo momento. Si è verificato un errore." };
  }
}

export async function sendTestEmailAction(input: SendTestEmailInput): Promise<SendTestEmailOutput> {
  try {
    const result = await sendTestEmail(input);
    return result;
  } catch (error: any) {
    console.error("Error sending test email:", error);
    return { success: false, error: error.message || "An unknown error occurred." };
  }
}

export async function testGcsConnectionAction(input: TestGcsConnectionInput): Promise<TestGcsConnectionOutput> {
    try {
        const result = await testGcsConnectionFlow(input);
        return result;
    } catch (error: any) {
        console.error("Error testing GCS connection:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function fetchAttachmentAction(input: FetchFileFromGcsInput): Promise<FetchFileFromGcsOutput> {
    try {
        const result = await fetchFileFromGcsFlow(input);
        return result;
    } catch (error: any) {
        console.error("Error fetching attachment:", error);
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
    if (company.id) {
        await addDoc(collection(db, 'emailLogs'), {
            companyId: company.id,
            timestamp: new Date().toISOString(),
            recipient: recipientEmail,
            subject: emailSubject,
            status: 'failure',
            error: error.message || 'An unknown error occurred.',
        });
    }

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
    const user = await getUserByEmail(email);
    if (!user) {
        // Don't reveal if user exists, for security.
        return { success: true, message: "Se un account con questa email esiste, un link di reset verrà inviato." };
    }
    
    const company = await getCompanyByUserId(user.id);
    if (!company || !company.smtpHost) {
        return { success: false, message: "Impossibile inviare email. La configurazione SMTP dell'azienda non è completa." };
    }

    try {
        const token = await createPasswordResetToken(user.id);
        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

        const input: SendPasswordResetEmailInput = {
            recipientEmail: user.email,
            userName: user.name,
            resetLink,
            companyId: company.id,
            smtpConfig: {
                host: company.smtpHost,
                port: company.smtpPort!,
                user: company.smtpUser!,
                pass: company.smtpPass!,
                from: company.senderEmail!,
            }
        };

        const result = await sendPasswordResetEmail(input);

        if (result.success) {
            return { success: true, message: "Se un account con questa email esiste, un link di reset verrà inviato." };
        } else {
            return { success: false, message: result.error || "Impossibile inviare l'email di reset password." };
        }

    } catch (error: any) {
        console.error("Error in password reset request:", error);
        return { success: false, message: "Si è verificato un errore durante la richiesta di reset." };
    }
}

export async function handlePasswordReset(token: string, newPassword: string):Promise<{ success: boolean, message: string }> {
    try {
        return await resetUserPassword(token, newPassword);
    } catch (error: any) {
        console.error("Error resetting password:", error);
        return { success: false, message: "Si è verificato un errore." };
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
    
export async function sendCredentialsEmailAction(userId: string): Promise<SendCredentialsEmailOutput> {
    const user = await getUserById(userId);
    if (!user) {
        return { success: false, error: 'User not found.' };
    }
    
    if (user.role === 'Client') {
        return { success: false, error: 'Cannot send credentials to a client user.' };
    }
    
    const company = await getCompanyByUserId(userId);
    if (!company || !company.smtpHost || !company.senderEmail) {
        return { success: false, error: 'La configurazione SMTP per questa azienda è incompleta.' };
    }
    
    if (!user.password) {
         return { success: false, error: 'Nessuna password impostata per questo utente. Modificare il profilo utente per impostarne una.' };
    }

    try {
        const input: SendCredentialsEmailInput = {
            recipientEmail: user.email,
            userName: user.name,
            userEmail: user.email,
            userPassword: user.password,
            loginLink: 'https://work.mannatec.it',
            companyId: company.id,
            smtpConfig: {
                host: company.smtpHost,
                port: company.smtpPort!,
                user: company.smtpUser!,
                pass: company.smtpPass!,
                from: company.senderEmail!,
            }
        };

        return await sendCredentialsEmail(input);

    } catch (error: any) {
        console.error("Error sending credentials email:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}
