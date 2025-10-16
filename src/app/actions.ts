
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
import { sendSupportTicketNotification } from '@/ai/flows/send-support-ticket-notification';
import { updateCompany, getUserByEmail, createPasswordResetToken, getCompanyByUserId, resetUserPassword, getUserById, createAutologinToken, updateUser } from '@/lib/data';
import { Company, User } from '@/lib/types';
import { Resend } from 'resend';
import type { SendNotificationEmailInput, SendNotificationEmailOutput } from '@/ai/flows/send-notification-email';
import type { SendExpiryNotificationInput, SendExpiryNotificationOutput } from '@/ai/flows/send-expiry-notification';
import type { SendNewInterventionNotificationInput, SendNewInterventionOutput } from '@/ai/flows/send-new-intervention-notification';
import type { SendPasswordResetEmailInput, SendPasswordResetEmailOutput } from '@/ai/flows/send-password-reset-email';
import type { SendCredentialsEmailInput, SendCredentialsEmailOutput } from '@/ai/flows/send-credentials-email';
import type { SendSupportTicketNotificationInput, SendSupportTicketNotificationOutput } from '@/lib/types';
import type { SendTestEmailInput, SendTestEmailOutput, TestGcsConnectionInput, TestGcsConnectionOutput, FetchFileFromGcsInput, FetchFileFromGcsOutput } from '@/lib/types';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BFs_U33A8I4P6hC-njsOxgF9sVGNwVfP94T8A1a-8FqH9qJ3a7gC6c4dF5eX6jJ0a3dZ7w8b9jY0c1bA0aB9dE8';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'pP1vHwzH9-u0qXkI6nZ_rYf3eD2c1B0a9s8d7f6g5h4j3k2l1m0n';

let vapidDetailsSet = false;

function ensureVapidDetails() {
    if (!vapidDetailsSet && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
            'mailto:your-email@example.com',
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
        );
        vapidDetailsSet = true;
    } else if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
         console.warn("VAPID keys not found. Push notifications will not work.");
    }
}


export async function savePushSubscription(userId: string, subscription: webpush.PushSubscription) {
    try {
        const user = await getUserById(userId);
        if (!user) {
            return { success: false, error: 'User not found' };
        }

        const existingSubscriptions = user.pushSubscriptions || [];
        
        // Avoid duplicates
        const alreadyExists = existingSubscriptions.some(
            (sub) => sub.endpoint === subscription.endpoint
        );

        if (!alreadyExists) {
            const updatedSubscriptions = [...existingSubscriptions, subscription];
            await updateUser(userId, { pushSubscriptions: updatedSubscriptions });
        }
        
        return { success: true };
    } catch (error: any) {
        console.error('Error saving push subscription:', error);
        return { success: false, error: error.message };
    }
}

export async function sendPushNotification(subscription: webpush.PushSubscription, payload: string) {
    ensureVapidDetails();
    if (!vapidDetailsSet) {
        return { success: false, error: "VAPID keys not configured on the server." };
    }
    try {
        await webpush.sendNotification(subscription, payload);
        return { success: true };
    } catch (error: any) {
        console.error('Error sending push notification:', error);
        if (error.statusCode === 410) {
            // Subscription is no longer valid, we should remove it
            return { success: false, error: 'Subscription expired or invalid.', expired: true, endpoint: error.endpoint };
        }
        return { success: false, error: error.message };
    }
}


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
  notifyClient: boolean;
}

export async function sendClientUpdateEmail(input: SendClientUpdateEmailInput): Promise<{ success: boolean; error?: string }> {
  const { recipientEmail, clientName, interventionId, interventionTitle, interventionStatus, updateMessage, interventionLink, company, notifyClient } = input;
  
  if (!notifyClient) {
      return { success: true };
  }

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
    if (!company.resendApiKey || !company.senderEmail) {
      throw new Error('La configurazione di Resend per questa azienda è incompleta.');
    }
    
    const resend = new Resend(company.resendApiKey);

    const { data, error } = await resend.emails.send({
        from: company.senderEmail,
        to: recipientEmail,
        subject: emailSubject,
        html: emailBody,
    });

    if (error) {
        throw error;
    }

    return { success: true };

  } catch (error: any) {
    console.error(`[sendClientUpdateEmail] FAILED for ${recipientEmail}:`, error.message);
    return { success: false, error: error.message || 'An unknown error occurred during email sending.' };
  }
}


export async function updateCompanySettings(companyId: string, settings: Partial<Company>): Promise<Company | null> {
    try {
        const result = await updateCompany(companyId, settings);
        return result;
    } catch (error: any) {
        console.error("Error saving company settings:", error);
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

export async function triggerNewInterventionNotification(input: SendNewInterventionNotificationInput): Promise<SendNewInterventionOutput> {
    try {
        const result = await sendNewInterventionNotification(input);
        return result;
    } catch (error: any) {
        console.error("Error sending new intervention notification email:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function triggerSupportTicketNotification(input: SendSupportTicketNotificationInput): Promise<SendSupportTicketNotificationOutput> {
    try {
        const result = await sendSupportTicketNotification(input);
        return result;
    } catch (error: any) {
        console.error("Error sending support ticket notification email:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function handlePasswordResetRequest(email: string): Promise<{ success: boolean, message: string }> {
    const user = await getUserByEmail(email);
    if (!user || user.email.endsWith('@mannatec.it')) {
        // Don't reveal if user exists or is a system user, for security.
        return { success: true, message: "Se un account valido con questa email esiste, un link di reset verrà inviato." };
    }
    
    const company = await getCompanyByUserId(user.id);
    if (!company || !company.resendApiKey || !company.senderEmail) {
        return { success: false, message: "Impossibile inviare email. La configurazione di Resend per l'azienda non è completa." };
    }

    try {
        const token = await createPasswordResetToken(user.id);
        const baseUrl = company.platformUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://work.mannatec.it';
        const resetLink = `${baseUrl}/reset-password?token=${token}`;

        const input: SendPasswordResetEmailInput = {
            recipientEmail: user.email,
            userName: user.name,
            resetLink,
            companyId: company.id,
            resendConfig: {
                apiKey: company.resendApiKey,
                from: company.senderEmail,
            }
        };

        const result = await sendPasswordResetEmail(input);

        if (result.success) {
            return { success: true, message: "Se un account valido con questa email esiste, un link di reset verrà inviato." };
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
    
export async function sendCredentialsEmailAction(userId: string): Promise<SendCredentialsEmailOutput> {
    const user = await getUserById(userId);
    if (!user) {
        return { success: false, error: 'User not found.' };
    }
    
    const company = await getCompanyByUserId(userId);
    if (!company || !company.resendApiKey || !company.senderEmail) {
        return { success: false, error: 'La configurazione di Resend per questa azienda è incompleta.' };
    }
    
    if (!user.password) {
         return { success: false, error: 'Nessuna password impostata per questo utente. Modificare il profilo utente per impostarne una.' };
    }

    try {
        const baseUrl = company.platformUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://work.mannatec.it';
        const input: SendCredentialsEmailInput = {
            recipientEmail: user.email,
            userName: user.name,
            userEmail: user.email,
            userPassword: user.password,
            loginLink: baseUrl,
            companyId: company.id,
            resendConfig: {
                apiKey: company.resendApiKey,
                from: company.senderEmail,
            }
        };

        return await sendCredentialsEmail(input);

    } catch (error: any) {
        console.error("Error sending credentials email:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function createClientAutologinUrl(clientId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const client = await getUserById(clientId);
    if (!client || client.role !== 'Client') {
        return { success: false, error: 'Utente non trovato o non è un cliente.' };
    }

    const company = await getCompanyByUserId(clientId);
    if (!company) {
        return { success: false, error: 'Impossibile trovare l\'azienda associata.' };
    }

    try {
        const token = await createAutologinToken(clientId);
        const baseUrl = company.platformUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://work.mannatec.it';
        const url = `${baseUrl}/login?autologin_token=${token}`;
        return { success: true, url };
    } catch (error: any) {
        console.error("Error creating autologin URL:", error);
        return { success: false, error: 'Errore durante la creazione del link di accesso.' };
    }
}
