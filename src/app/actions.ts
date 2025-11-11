

'use server';
import 'dotenv/config';

import { generateKpiDashboard, GenerateKpiDashboardInput, GenerateKpiDashboardOutput } from '@/ai/flows/generate-kpi-dashboard';
import { sendNewInterventionNotification } from '@/ai/flows/send-new-intervention-notification';
import { sendPasswordResetEmail } from '@/ai/flows/send-password-reset-email';
import { sendCredentialsEmail } from '@/ai/flows/send-credentials-email';
import { sendTestEmail } from '@/ai/flows/send-test-email';
import { testGcsConnection as testGcsConnectionFlow } from '@/ai/flows/test-gcs-connection';
import { fetchFileFromGcs as fetchFileFromGcsFlow } from '@/ai/flows/fetch-file-from-gcs';
import { sendSupportTicketNotification } from '@/ai/flows/send-support-ticket-notification';
import { updateCompany, getUserByEmail, createPasswordResetToken, getCompanyByUserId, resetUserPassword, getUserById, createAutologinToken, updateUser, addCompany, getCompanyById, getAppConfiguration, getInterventions, getUsers } from '@/lib/data';
import { Company, User, Intervention, ScheduledMaintenance } from '@/lib/types';
import { Resend } from 'resend';
import type { SendNewInterventionNotificationInput, SendNewInterventionNotificationOutput } from '@/ai/flows/send-new-intervention-notification';
import type { SendPasswordResetEmailInput, SendPasswordResetEmailOutput } from '@/ai/flows/send-password-reset-email';
import type { SendCredentialsEmailInput, SendCredentialsEmailOutput } from '@/ai/flows/send-credentials-email';
import type { SendSupportTicketNotificationInput, SendSupportTicketNotificationOutput } from '@/lib/types';
import type { SendTestEmailInput, SendTestEmailOutput, TestGcsConnectionInput, TestGcsConnectionOutput, FetchFileFromGcsInput, FetchFileFromGcsOutput } from '@/lib/types';
import webpush from 'web-push';
import { generateShortId } from '@/lib/utils';
import { addDays, isAfter, isBefore, startOfToday, format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';


const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BAbd3o1jCl3s9l1nJqprnO6S52aP9J6kLo0up6b8P8r_28s8-IBPxIXvjAs7xJt5fXAyJEV7nh0C2MGM0z2Y24I';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'Zl2wTSSZ0Xp_pX1R_p3bT5pT-yL9a1xV6b8Z_0gY_xQ';


let vapidDetailsSet = false;

function ensureVapidDetails() {
    if (!vapidDetailsSet && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        try {
            webpush.setVapidDetails(
                'mailto:your-email@example.com',
                VAPID_PUBLIC_KEY,
                VAPID_PRIVATE_KEY
            );
            vapidDetailsSet = true;
        } catch (error) {
            console.error("Error setting VAPID details:", error);
            // This will prevent repeated attempts with invalid keys.
            vapidDetailsSet = true; 
        }
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


export async function triggerNewInterventionNotification(input: SendNewInterventionNotificationInput): Promise<SendNewInterventionNotificationOutput> {
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
    if (!user || user.email.endsWith('@mannatic.it')) {
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

export async function handleRegistration(values: { companyName: string, name: string, email: string }): Promise<{ success: boolean, user?: User, error?: string }> {
    try {
        const password = generateShortId(12);

        const { company, adminUser } = await addCompany({
            name: values.companyName,
            adminName: values.name,
            email: values.email,
            password: password,
        });

        if (!adminUser) {
            throw new Error("Creation of admin user failed during registration.");
        }
        
        // Use global/creator Resend config to send the initial email
        const appConfig = await getAppConfiguration();
        if (!appConfig || !appConfig.resendApiKey || !appConfig.defaultSenderEmail) {
            console.warn("Global Resend config not set. Skipping registration email.");
            return { success: true, user: adminUser };
        }

        const input: SendCredentialsEmailInput = {
            recipientEmail: adminUser.email,
            userName: adminUser.name,
            userEmail: adminUser.email,
            userPassword: adminUser.password!,
            loginLink: company.platformUrl || 'https://work.mannatec.it',
            companyId: company.id,
            resendConfig: {
                apiKey: appConfig.resendApiKey,
                from: appConfig.defaultSenderEmail,
            }
        };

        await sendCredentialsEmail(input);

        return { success: true, user: adminUser };
    } catch (error: any) {
        return { success: false, error: error.message || "Si è verificato un errore durante la registrazione." };
    }
}

// Expiring Interventions Summary Email Action
export async function sendExpiringInterventionsSummaryEmail(companyId: string): Promise<{ success: boolean; error?: string }> {
    const company = await getCompanyById(companyId);
    if (!company || !company.resendApiKey || !company.senderEmail) {
        return { success: false, error: `Configurazione Resend per l'azienda ${company?.name || companyId} non trovata.` };
    }

    const twoDaysFromNow = addDays(startOfToday(), 2);
    const interventions = (await getInterventions(companyId)).filter(i => 
        !i.isMaintenance && 
        i.status !== 'Completato' && 
        i.status !== 'Annullato' && 
        i.dueDate && 
        isBefore(new Date(i.dueDate), twoDaysFromNow) && 
        isAfter(new Date(i.dueDate), new Date())
    );
    
    if (interventions.length === 0) {
        console.log(`Nessun intervento in scadenza per l'azienda ${company.name}. Salto invio riepilogo.`);
        return { success: true };
    }

    const allUsers = await getUsers(companyId);
    let operators: User[];

    if (company.cronJobRecipients && company.cronJobRecipients.length > 0) {
        operators = allUsers.filter(u => company.cronJobRecipients!.includes(u.id) && u.role === 'Operator' && u.email);
    } else {
        operators = allUsers.filter(u => u.role === 'Operator' && u.email);
    }

    if (operators.length === 0) {
        console.log(`Nessun operatore destinatario trovato per l'azienda ${company.name}. Salto invio riepilogo.`);
        return { success: true }; // No one to send to, but not an error.
    }

    const clients = allUsers.filter(u => u.role === 'Client');
    const interventionDetails = interventions.map(i => {
        const client = clients.find(c => c.id === i.clientId);
        const operator = operators.find(o => o.id === i.assignedOperatorId);
        return {
            id: i.id,
            title: i.title,
            clientName: client?.name || 'N/D',
            dueDate: format(new Date(i.dueDate!), 'dd/MM/yyyy HH:mm', { locale: it }),
            priority: i.priority,
            operatorName: operator?.name || 'Non Assegnato',
        }
    });

    const subject = `Riepilogo Interventi in Scadenza - MannaTic per ${company.name}`;
    
    const tableRows = interventionDetails.map(i => `
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.id}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.title} <br><small>${i.clientName}</small></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.dueDate}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.priority}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.operatorName}</td>
        </tr>
    `).join('');

    const body = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Riepilogo Interventi in Scadenza</h2>
            <p>Ciao team, ecco un riepilogo degli interventi che richiedono attenzione nei prossimi giorni.</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">ID</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Titolo e Cliente</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Scadenza</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Priorità</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Operatore</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <p>Buon lavoro,<br>Il Team di MannaTic</p>
        </div>
    `;

    try {
        const resend = new Resend(company.resendApiKey);
        await resend.emails.send({
            from: company.senderEmail,
            to: operators.map(o => o.email!),
            subject: subject!,
            html: body!,
        });
        return { success: true };
    } catch (e: any) {
        console.error(`Error sending summary email for company ${companyId}:`, e);
        return { success: false, error: e.message || "Impossibile inviare l'email di riepilogo." };
    }
}

export async function sendOverdueInterventionsSummaryEmail(companyId: string): Promise<{ success: boolean; error?: string }> {
    const company = await getCompanyById(companyId);
    if (!company || !company.resendApiKey || !company.senderEmail) {
        return { success: false, error: `Configurazione Resend per l'azienda ${company?.name || companyId} non trovata.` };
    }

    const sevenDaysAgo = subDays(startOfToday(), 7);
    const interventions = (await getInterventions(companyId)).filter(i => 
        !i.isMaintenance && 
        ['Nuovo', 'In corso'].includes(i.status) &&
        isBefore(new Date(i.createdAt), sevenDaysAgo)
    );
    
    if (interventions.length === 0) {
        console.log(`Nessun intervento aperto da più di 7 giorni per l'azienda ${company.name}. Salto invio riepilogo settimanale.`);
        return { success: true };
    }
    
    const allUsers = await getUsers(companyId);
    let admins: User[];

    if (company.cronJobRecipients && company.cronJobRecipients.length > 0) {
        const recipientUsers = (await Promise.all(
            company.cronJobRecipients.map(id => getUserById(id))
        )).filter((u): u is User => u !== null);
        
        admins = recipientUsers.filter(u => u.role === 'Admin' && u.email);
        
        if (admins.length === 0) {
            admins = allUsers.filter(u => u.role === 'Admin' && u.email);
        }
    } else {
        admins = allUsers.filter(u => u.role === 'Admin' && u.email);
    }
    
    const clients = allUsers.filter(u => u.role === 'Client');
    const operators = allUsers.filter(u => u.role === 'Operator');

    if (admins.length === 0) {
        console.log(`Nessun admin con email trovato per l'azienda ${company.name}. Salto invio riepilogo settimanale.`);
        return { success: true };
    }

    const interventionDetails = interventions.map(i => {
        const client = clients.find(c => c.id === i.clientId);
        const operator = operators.find(o => o.id === i.assignedOperatorId);
        return {
            id: i.id,
            title: i.title,
            clientName: client?.name || 'N/D',
            createdAt: format(new Date(i.createdAt), 'dd/MM/yyyy', { locale: it }),
            priority: i.priority,
            status: i.status,
            operatorName: operator?.name || 'Non Assegnato',
        }
    });

    const subject = `Riepilogo Settimanale: Interventi Aperti da Oltre 7 Giorni - MannaTic per ${company.name}`;
    
    const tableRows = interventionDetails.map(i => `
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.id}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.title} <br><small>${i.clientName}</small></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.createdAt}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.status}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.priority}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.operatorName}</td>
        </tr>
    `).join('');

    const body = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Riepilogo Settimanale: Interventi Aperti da Oltre 7 Giorni</h2>
            <p>Ciao team, ecco un riepilogo degli interventi che sono aperti da più di una settimana e potrebbero richiedere attenzione.</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">ID</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Titolo e Cliente</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Data Creazione</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Stato</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Priorità</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Operatore</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <p>Buona settimana,<br>Il Team di MannaTic</p>
        </div>
    `;

    try {
        const resend = new Resend(company.resendApiKey);
        await resend.emails.send({
            from: company.senderEmail,
            to: admins.map(a => a.email!),
            subject: subject!,
            html: body!,
        });
        return { success: true };
    } catch (e: any) {
        console.error(`Error sending weekly summary email for company ${companyId}:`, e);
        return { success: false, error: e.message || "Impossibile inviare l'email di riepilogo settimanale." };
    }
}

export async function testDailySummaryAction(companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
        return await sendExpiringInterventionsSummaryEmail(companyId);
    } catch (error: any) {
        console.error("Error manually triggering daily summary:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function testWeeklySummaryAction(companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
        return await sendOverdueInterventionsSummaryEmail(companyId);
    } catch (error: any) {
        console.error("Error manually triggering weekly summary:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}
    

    




    

    
