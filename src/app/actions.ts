
'use server';

import { generateKpiDashboard, GenerateKpiDashboardInput, GenerateKpiDashboardOutput } from '@/ai/flows/generate-kpi-dashboard';
import { sendNewInterventionNotification } from '@/ai/flows/send-new-intervention-notification';
import { sendPasswordResetEmail } from '@/ai/flows/send-password-reset-email';
import { sendCredentialsEmail } from '@/ai/flows/send-credentials-email';
import { sendTestEmail } from '@/ai/flows/send-test-email';
import { testGcsConnection as testGcsConnectionFlow } from '@/ai/flows/test-gcs-connection';
import { fetchFileFromGcs as fetchFileFromGcsFlow } from '@/ai/flows/fetch-file-from-gcs';
import { sendSupportTicketNotification } from '@/ai/flows/send-support-ticket-notification';
import { sendAssignedInterventionNotification } from '@/ai/flows/send-assigned-intervention-notification';
import { sendInterventionReminderEmail } from '@/ai/flows/send-intervention-reminder-email';
import { updateCompany, getUserByEmail, createPasswordResetToken, getCompanyByUserId, resetUserPassword, getUserById, createAutologinToken, updateUser, addCompany, getCompanyById, getAppConfiguration, getInterventions, getUsers, addIntervention, getSupportTicketById, addSupportMessage, updateSupportTicketStatus } from '@/lib/data';
import { Company, User, Intervention, ScheduledMaintenance, getCompanyNotificationSettings, getOperatorNotificationPreferences } from '@/lib/types';
import { Resend } from 'resend';
import { sendEmail } from '@/lib/mailer';
import type { SendNewInterventionNotificationInput, SendNewInterventionNotificationOutput } from '@/ai/flows/send-new-intervention-notification';
import type { SendPasswordResetEmailInput, SendPasswordResetEmailOutput } from '@/ai/flows/send-password-reset-email';
import type { SendCredentialsEmailInput, SendCredentialsEmailOutput } from '@/ai/flows/send-credentials-email';
import type { SendSupportTicketNotificationInput, SendSupportTicketNotificationOutput, SendAssignedInterventionNotificationInput, SendAssignedInterventionNotificationOutput, SendInterventionReminderEmailInput, SendInterventionReminderEmailOutput } from '@/lib/types';
import type { SendTestEmailInput, SendTestEmailOutput, TestGcsConnectionInput, TestGcsConnectionOutput, FetchFileFromGcsInput, FetchFileFromGcsOutput } from '@/lib/types';
import webpush from 'web-push';
import { addDays, isAfter, isBefore, startOfToday, format, subDays, differenceInHours, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { headers } from 'next/headers';


const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';


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
    const result = await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailBody,
      resendConfig: company?.resendApiKey && company?.senderEmail ? {
        apiKey: company.resendApiKey,
        from: company.senderEmail,
      } : undefined,
    });

    if (!result.success) {
      throw new Error(result.error || 'Invio email fallito.');
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

export async function triggerAssignedInterventionNotification(input: SendAssignedInterventionNotificationInput): Promise<SendAssignedInterventionNotificationOutput> {
    try {
        const result = await sendAssignedInterventionNotification(input);
        return result;
    } catch (error: any) {
        console.error("Error sending assigned intervention notification email:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function triggerInterventionReminderEmail(input: SendInterventionReminderEmailInput): Promise<SendInterventionReminderEmailOutput> {
    try {
        const result = await sendInterventionReminderEmail(input);
        return result;
    } catch (error: any) {
        console.error("Error sending intervention reminder email:", error);
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
    const cleanEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(cleanEmail);
    if (!user || user.email.endsWith('@mannatic.it')) {
        // Don't reveal if user exists or is a system user, for security.
        return { success: true, message: "Se un account valido con questa email esiste, un link di reset verrà inviato." };
    }
    
    const company = await getCompanyByUserId(user.id);

    try {
        const token = await createPasswordResetToken(user.id);
        const host = (await headers()).get('host');
        const protocol = host?.includes('localhost') || host?.includes('.workstations.google.com') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;
        const resetLink = `${baseUrl}/reset-password?token=${token}`;

        const input: SendPasswordResetEmailInput = {
            recipientEmail: user.email,
            userName: user.name,
            resetLink,
            companyId: company?.id || 'none',
            resendConfig: company?.resendApiKey && company?.senderEmail ? {
                apiKey: company.resendApiKey,
                from: company.senderEmail,
            } : {
                apiKey: '',
                from: '',
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
        return { success: false, error: 'Utente non trovato.' };
    }
    
    const company = await getCompanyByUserId(userId);
    
    if (!user.password) {
         return { success: false, error: 'Nessuna password impostata per questo utente. Modificare il profilo utente per impostarne una.' };
    }

    try {
        const host = (await headers()).get('host');
        const protocol = host?.includes('localhost') || host?.includes('.workstations.google.com') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;
        
        const input: SendCredentialsEmailInput = {
            recipientEmail: user.email,
            userName: user.name,
            userEmail: user.email,
            userPassword: user.password,
            loginLink: baseUrl,
            companyId: company?.id || 'none',
            resendConfig: company?.resendApiKey && company?.senderEmail ? {
                apiKey: company.resendApiKey,
                from: company.senderEmail,
            } : {
                apiKey: '',
                from: '',
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
    if (!client) {
        return { success: false, error: 'Utente non trovato.' };
    }

    let company = await getCompanyByUserId(clientId);
    if (!company && client.companyId) {
        company = await getCompanyById(client.companyId);
    }
    const companyId = company?.id || client.companyId || 'none';

    try {
        const token = await createAutologinToken(clientId, companyId);
        const headersList = await headers();
        const host = headersList.get('x-forwarded-host') || headersList.get('host');
        const proto = headersList.get('x-forwarded-proto') || (host?.includes('localhost') || host?.includes('127.0.0.1') || host?.includes('.workstations.google.com') ? 'http' : 'https');
        const baseUrl = host ? `${proto}://${host}` : (company?.platformUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://work.mannatec.it');
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

        const host = (await headers()).get('host');
        const protocol = host?.includes('localhost') || host?.includes('.workstations.google.com') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;

        const input: SendCredentialsEmailInput = {
            recipientEmail: adminUser.email,
            userName: adminUser.name,
            userEmail: adminUser.email,
            userPassword: adminUser.password!,
            loginLink: baseUrl,
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

// Expiring Interventions Summary Email 
export async function sendExpiringInterventionsSummaryEmail(companyId: string): Promise<{ success: boolean; error?: string }> {
    const company = await getCompanyById(companyId);
    if (!company) {
        return { success: false, error: `Installatore ${companyId} non trovato.` };
    }

    const settings = getCompanyNotificationSettings(company);
    if (!settings.dailySummaryEnabled) {
        console.log(`Riepilogo giornaliero disattivato per l'installatore ${company.name}. Salto invio.`);
        return { success: true };
    }

    const twoDaysFromNow = addDays(startOfToday(), 2);
    const allInterventions = await getInterventions(companyId);

    // 1. Interventi con scadenza prevista entro 48 ore
    const expiringInterventions = allInterventions.filter(i => 
        !i.isMaintenance && 
        i.status !== 'Completato' && 
        i.status !== 'Annullato' && 
        i.dueDate && 
        isBefore(new Date(i.dueDate), twoDaysFromNow) && 
        isAfter(new Date(i.dueDate), new Date())
    );

    // 2. Interventi aperti NON ancora assegnati ad alcun tecnico (se l'opzione è attiva)
    const unassignedInterventions = (settings.dailySummaryIncludeUnassigned !== false)
        ? allInterventions.filter(i =>
            !i.isMaintenance &&
            i.status !== 'Completato' &&
            i.status !== 'Annullato' &&
            (!i.assignedOperatorIds || i.assignedOperatorIds.length === 0)
        )
        : [];
    
    if (expiringInterventions.length === 0 && unassignedInterventions.length === 0) {
        console.log(`Nessun intervento in scadenza o non assegnato per l'installatore ${company.name}. Salto invio riepilogo.`);
        return { success: true };
    }

    const allUsers = await getUsers(companyId);
    const targetRecipients: User[] = [];

    // 1. Destinatari Amministratori se abilitati
    if (settings.dailySummaryToAdmins) {
        const admins = allUsers.filter(u => (u.role === 'Admin' || u.role === 'Creator') && !!u.email);
        targetRecipients.push(...admins);
    }

    // 2. Destinatari Operatori se abilitati
    if (settings.dailySummaryToOperators) {
        if (settings.dailySummaryIncludeAllOperators) {
            // Invia a TUTTI gli operatori dell'azienda (inclusi quelli non specificamente abilitati nella matrice)
            const allOperators = allUsers.filter(u => u.role === 'Operator' && !!u.email);
            targetRecipients.push(...allOperators);
        } else {
            // Invia solo agli operatori abilitati nella matrice
            const eligibleOperators = allUsers.filter(u => {
                if (u.role !== 'Operator' || !u.email) return false;
                return getOperatorNotificationPreferences(settings, u.id).dailySummary;
            });
            targetRecipients.push(...eligibleOperators);
        }
    }

    // De-duplicazione per email
    const uniqueMap = new Map<string, User>();
    for (const u of targetRecipients) {
        if (u.email && !uniqueMap.has(u.email.toLowerCase())) {
            uniqueMap.set(u.email.toLowerCase(), u);
        }
    }
    const operators = Array.from(uniqueMap.values());
    
    if (operators.length === 0) {
        console.log(`Nessun destinatario per il riepilogo interventi per l'installatore ${company.name}.`);
        return { success: true };
    }

    const hasExpiring = expiringInterventions.length > 0;
    const hasUnassigned = unassignedInterventions.length > 0;

    let subject = `Riepilogo Interventi (48h) - ${company.name}`;
    if (hasExpiring && hasUnassigned) {
        subject = `Riepilogo Interventi in Scadenza 48h & Non Assegnati - ${company.name}`;
    } else if (hasUnassigned) {
        subject = `Riepilogo Interventi NON Assegnati (${unassignedInterventions.length}) - ${company.name}`;
    } else {
        subject = `Riepilogo Interventi in Scadenza 48h (${expiringInterventions.length}) - ${company.name}`;
    }

    const expiringTableRows = expiringInterventions.map(i => {
        const assignedOpNames = i.assignedOperatorIds && i.assignedOperatorIds.length > 0
            ? allUsers.filter(u => i.assignedOperatorIds.includes(u.id)).map(u => u.name).join(', ')
            : '<span style="color: #dc2626; font-weight: bold;">Non assegnato</span>';
            
        return `
            <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 500;">#${i.id} - ${i.title}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${i.dueDate ? format(new Date(i.dueDate), 'dd/MM/yyyy HH:mm', { locale: it }) : 'N/D'}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${i.priority === 'Critica' ? '#fee2e2; color: #b91c1c;' : '#f1f5f9; color: #475569;'}">
                        ${i.priority}
                    </span>
                </td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${assignedOpNames}</td>
            </tr>
        `;
    }).join('');

    const unassignedTableRows = unassignedInterventions.map(i => {
        const client = allUsers.find(u => u.id === i.clientId);
        return `
            <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 500;">#${i.id} - ${i.title}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${client?.name || 'N/D'}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${format(new Date(i.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #fee2e2; color: #b91c1c;">
                        In attesa di Tecnico
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    const body = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 24px;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Riepilogo Interventi 48 Ore</h1>
                <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Azienda: <strong>${company.name}</strong> • Data: ${format(new Date(), 'dd/MM/yyyy', { locale: it })}</p>
            </div>

            <div style="padding: 24px;">
                ${hasExpiring ? `
                    <div style="margin-bottom: 28px;">
                        <h2 style="font-size: 16px; margin: 0 0 12px; color: #1e40af; display: flex; align-items: center; gap: 8px;">
                            📅 Interventi in Scadenza nelle prossime 48 ore (${expiringInterventions.length})
                        </h2>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background-color: #f8fafc; color: #475569; text-align: left;">
                                    <th style="padding: 8px 10px; border: 1px solid #e2e8f0;">Intervento</th>
                                    <th style="padding: 8px 10px; border: 1px solid #e2e8f0;">Scadenza Prevista</th>
                                    <th style="padding: 8px 10px; border: 1px solid #e2e8f0;">Priorità</th>
                                    <th style="padding: 8px 10px; border: 1px solid #e2e8f0;">Tecnici Assegnati</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${expiringTableRows}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                ${hasUnassigned ? `
                    <div style="margin-bottom: 20px;">
                        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
                            <h2 style="font-size: 15px; margin: 0; color: #92400e;">
                                ⚠️ Interventi Aperti NON Ancora Assegnati (${unassignedInterventions.length})
                            </h2>
                            <p style="margin: 4px 0 0; font-size: 12px; color: #78350f;">
                                I seguenti interventi non hanno ancora nessun tecnico assegnato e richiedono presa in carico:
                            </p>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background-color: #f8fafc; color: #475569; text-align: left;">
                                    <th style="padding: 8px 10px; border: 1px solid #e2e8f0;">Intervento</th>
                                    <th style="padding: 8px 10px; border: 1px solid #e2e8f0;">Cliente</th>
                                    <th style="padding: 8px 10px; border: 1px solid #e2e8f0;">Aperto il</th>
                                    <th style="padding: 8px 10px; border: 1px solid #e2e8f0;">Stato Assegnazione</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${unassignedTableRows}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <a href="https://supporto.mannatec.it/dashboard/interventions" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 22px; border-radius: 6px;">
                        Accedi alla Dashboard Interventi
                    </a>
                    <p style="margin: 15px 0 0; font-size: 12px; color: #94a3b8;">MannaTic Service Platform • Notifica automatica generata dal sistema</p>
                </div>
            </div>
        </div>
    `;

    try {
        const result = await sendEmail({
            to: operators.map(o => o.email!).filter(Boolean),
            subject,
            html: body,
            resendConfig: company.resendApiKey && company.senderEmail ? {
                apiKey: company.resendApiKey,
                from: company.senderEmail,
            } : undefined,
        });
        return { success: result.success, error: result.error };
    } catch (e: any) {
        console.error(`Error sending summary email for company ${companyId}:`, e);
        return { success: false, error: e.message || "Impossibile inviare l'email di riepilogo." };
    }
}

export async function sendOverdueInterventionsSummaryEmail(companyId: string): Promise<{ success: boolean; error?: string }> {
    const company = await getCompanyById(companyId);
    if (!company) {
        return { success: false, error: `Installatore ${companyId} non trovato.` };
    }

    const settings = getCompanyNotificationSettings(company);
    if (!settings.weeklySummaryEnabled) {
        console.log(`Riepilogo settimanale disattivato per l'installatore ${company.name}. Salto invio.`);
        return { success: true };
    }

    const sevenDaysAgo = subDays(startOfToday(), 7);
    const interventions = (await getInterventions(companyId)).filter(i => 
        !i.isMaintenance && 
        ['Nuovo', 'In corso'].includes(i.status) &&
        isBefore(new Date(i.createdAt), sevenDaysAgo)
    );
    
    if (interventions.length === 0) {
        console.log(`Nessun intervento aperto da più di 7 giorni per l'installatore ${company.name}. Salto invio riepilogo settimanale.`);
        return { success: true };
    }
    
    const allUsers = await getUsers(companyId);
    const targetRecipients: User[] = [];

    // 1. Destinatari Amministratori se abilitati
    if (settings.weeklySummaryToAdmins) {
        const admins = allUsers.filter(u => (u.role === 'Admin' || u.role === 'Creator') && !!u.email);
        targetRecipients.push(...admins);
    }

    // 2. Destinatari Operatori se abilitati
    if (settings.weeklySummaryIncludeOperators) {
        const eligibleOperators = allUsers.filter(u => {
            if (u.role !== 'Operator' || !u.email) return false;
            return getOperatorNotificationPreferences(settings, u.id).weeklySummary;
        });
        targetRecipients.push(...eligibleOperators);
    }

    // De-duplicazione per email
    const uniqueMap = new Map<string, User>();
    for (const u of targetRecipients) {
        if (u.email && !uniqueMap.has(u.email.toLowerCase())) {
            uniqueMap.set(u.email.toLowerCase(), u);
        }
    }
    const recipients = Array.from(uniqueMap.values());
    
    const clients = allUsers.filter(u => u.role === 'Client');
    const operators = allUsers.filter(u => u.role === 'Operator');

    if (recipients.length === 0) {
        console.log(`Nessun destinatario con email trovato per l'installatore ${company.name}. Salto invio riepilogo settimanale.`);
        return { success: true };
    }

    const interventionDetails = interventions.map(i => {
        const client = clients.find(c => c.id === i.clientId);
        const opIds = i.assignedOperatorIds || [];
        const operatorNames = opIds.map(id => operators.find(o => o.id === id)?.name).filter(Boolean).join(', ');
        
        return {
            id: i.id,
            title: i.title,
            clientName: client?.name || 'N/D',
            createdAt: format(new Date(i.createdAt), 'dd/MM/yyyy', { locale: it }),
            priority: i.priority,
            status: i.status,
            operatorNames: operatorNames || 'Non Assegnato',
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
            <td style="padding: 8px; border: 1px solid #ddd;">${i.operatorNames}</td>
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
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Operatori</th>
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
        const result = await sendEmail({
            to: recipients.map(a => a.email!).filter(Boolean),
            subject: subject!,
            html: body!,
            resendConfig: company.resendApiKey && company.senderEmail ? {
                apiKey: company.resendApiKey,
                from: company.senderEmail,
            } : undefined,
        });
        return { success: result.success, error: result.error };
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

export async function testOverdueAlertsAction(companyId: string): Promise<{ success: boolean; ticketsAlerted?: number; interventionsAlerted?: number; unassignedAlerted?: number; error?: string }> {
    try {
        return await sendOverdueTicketsAndInterventionsAlerts(companyId);
    } catch (error: any) {
        console.error("Error manually triggering overdue alerts:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}


export async function convertSupportTicketToIntervention(ticketId: string, adminUser: User): Promise<{ success: boolean, intervention?: Intervention, error?: string }> {
    if (!adminUser || adminUser.role !== 'Admin') {
        return { success: false, error: "Azione non autorizzata." };
    }

    try {
        const ticket = await getSupportTicketById(ticketId);
        if (!ticket) {
            return { success: false, error: "Ticket di supporto non trovato." };
        }

        const firstMessage = ticket.messages[0]?.text || "Vedi ticket di supporto correlato.";
        
        const newIntervention = await addIntervention({
            title: ticket.subject,
            description: firstMessage,
            clientId: ticket.clientId,
            companyId: ticket.companyId,
            priority: 'Media',
            creatorName: adminUser.name,
            assignedOperatorIds: [],
            notifyClient: true,
        });

        // Add a message to the support ticket and close it
        const updateMessage = `Questo ticket è stato convertito nell'intervento #${newIntervention.id}.`;
        await addSupportMessage(ticket.id, adminUser, updateMessage);
        await updateSupportTicketStatus(ticket.id, 'Chiuso');

        return { success: true, intervention: newIntervention };
    } catch (error: any) {
        console.error("Error converting support ticket to intervention:", error);
        return { success: false, error: error.message || "Si è verificato un errore sconosciuto." };
    }
}

export async function sendFilteredInterventionsSummaryEmail(
    companyId: string, 
    interventions: Intervention[], 
    recipientEmails: string[],
    adminName: string
): Promise<{ success: boolean; error?: string }> {
    const company = await getCompanyById(companyId);
    if (!company || !company.resendApiKey || !company.senderEmail) {
        return { success: false, error: "Configurazione email installatore incompleta." };
    }

    if (recipientEmails.length === 0) {
        return { success: false, error: "Nessun destinatario selezionato." };
    }

    const allUsers = await getUsers(companyId);
    const clients = allUsers.filter(u => u.role === 'Client');
    const operators = allUsers.filter(u => u.role === 'Operator');

    const tableRows = interventions.map(i => {
        const client = clients.find(c => c.id === i.clientId);
        const opIds = i.assignedOperatorIds || [];
        const opNames = opIds.map(id => operators.find(o => o.id === id)?.name).filter(Boolean).join(', ');
        const dueDate = i.dueDate ? format(new Date(i.dueDate), 'dd/MM/yy HH:mm', { locale: it }) : 'N/D';
        
        return `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${i.id}</td>
                <td style="padding: 8px; border: 1px solid #ddd;"><b>${client?.name || 'N/D'}</b><br>${i.title}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${i.status}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${i.priority}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${dueDate}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${opNames || 'Non assegnato'}</td>
            </tr>
        `;
    }).join('');

    const subject = `Riepilogo Interventi Selezionati - Inviato da ${adminName}`;
    const body = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Riepilogo Interventi</h2>
            <p>Ciao, ecco un riepilogo degli interventi selezionati e filtrati dall'amministratore <b>${adminName}</b>.</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">ID</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Cliente e Titolo</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Stato</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Priorità</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Scadenza</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Operatori</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <p style="margin-top: 20px;">Accedi a MannaTic per gestire le attività.</p>
            <p>Saluti,<br>Il Team di MannaTic</p>
        </div>
    `;

    try {
        const result = await sendEmail({
            to: recipientEmails,
            subject: subject,
            html: body,
            resendConfig: company.resendApiKey && company.senderEmail ? {
                apiKey: company.resendApiKey,
                from: company.senderEmail,
            } : undefined,
        });
        return { success: result.success, error: result.error };
    } catch (e: any) {
        console.error("Error sending filtered summary email:", e);
        return { success: false, error: e.message || "Impossibile inviare l'email." };
    }
}

export async function uploadAttachmentAction(base64Data: string, fileName: string, folder: string = 'attachments'): Promise<{ success: boolean; url: string; error?: string }> {
    const { uploadFileToSupabase } = await import('@/lib/supabase-storage');
    const res = await uploadFileToSupabase(base64Data, fileName, folder);
    if (res.error) {
        return { success: false, url: '', error: res.error };
    }
    return { success: true, url: res.url };
}

export async function sendOverdueTicketsAndInterventionsAlerts(companyId: string): Promise<{
    success: boolean;
    ticketsAlerted: number;
    interventionsAlerted: number;
    unassignedAlerted?: number;
    error?: string;
}> {
    try {
        const company = await getCompanyById(companyId);
        if (!company) {
            return { success: false, ticketsAlerted: 0, interventionsAlerted: 0, unassignedAlerted: 0, error: 'Azienda non trovata' };
        }

        const settings = getCompanyNotificationSettings(company);

        const { getSupportTickets, getInterventions, getUsers, addNotification } = await import('@/lib/data');
        const { supabase } = await import('@/lib/supabase');

        const allUsers = await getUsers(companyId);
        const admins = allUsers.filter(u => (u.role === 'Admin' || u.role === 'Creator') && u.email);
        const adminEmails = admins.map(a => a.email!).filter(Boolean);

        const now = new Date();
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3600 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://mannatec.it' : 'http://localhost:9002');

        let ticketsAlerted = 0;
        let interventionsAlerted = 0;
        let unassignedAlerted = 0;

        // 1. SOLLECITO: Ticket di supporto non chiusi entro 48 ore
        if (settings.overdueTicketsAlertEnabled && admins.length > 0) {
            const allTickets = await getSupportTickets(companyId);
            const overdueTickets = allTickets.filter(t => 
                t.status !== 'Chiuso' && 
                new Date(t.createdAt).getTime() <= fortyEightHoursAgo.getTime()
            );

            for (const ticket of overdueTickets) {
                // Verifica se è già stato inviato un sollecito nelle ultime 24 ore per questo ticket
                const { data: recentNotifs } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('related_intervention_id', ticket.id)
                    .eq('type', 'alert')
                    .gte('created_at', twentyFourHoursAgo);

                if (recentNotifs && recentNotifs.length > 0) {
                    continue; // Già inviato oggi, evita spam
                }

                const hoursOpen = Math.round((now.getTime() - new Date(ticket.createdAt).getTime()) / (3600 * 1000));
                const ticketUrl = `${baseUrl}/dashboard/support?ticketId=${ticket.id}`;

                // Invia notifica in-app agli admin
                for (const admin of admins) {
                    await addNotification({
                        userId: admin.id,
                        companyId,
                        message: `⚠️ SOLLECITO: Il ticket "${ticket.subject}" (${ticket.clientName}) è aperto da oltre 48 ore (${hoursOpen}h) ed è ancora in stato ${ticket.status}!`,
                        type: 'alert',
                        relatedInterventionId: ticket.id,
                    }).catch(e => console.error("Error adding in-app alert for ticket:", e));
                }

                // Invia email di sollecito agli admin
                if (adminEmails.length > 0) {
                    const lastMsg = ticket.messages && ticket.messages.length > 0 ? ticket.messages[ticket.messages.length - 1].text : '';
                    const emailHtml = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b;">
                            <div style="background-color: #d97706; color: white; padding: 18px 24px; border-radius: 8px 8px 0 0;">
                                <h2 style="margin: 0; font-size: 18px;">⚠️ SOLLECITO: Ticket di supporto aperto da oltre 48 ore</h2>
                                <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Azienda: ${company.name}</p>
                            </div>
                            <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
                                <p>Gentile Amministratore,</p>
                                <p>Il seguente ticket di supporto è stato aperto da più di 48 ore e non è ancora stato chiuso:</p>
                                
                                <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
                                    <p style="margin: 4px 0;"><strong>Oggetto:</strong> ${ticket.subject}</p>
                                    <p style="margin: 4px 0;"><strong>Cliente:</strong> ${ticket.clientName}</p>
                                    <p style="margin: 4px 0;"><strong>Data Apertura:</strong> ${format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}</p>
                                    <p style="margin: 4px 0;"><strong>Tempo trascorso:</strong> <b>${hoursOpen} ore</b></p>
                                    <p style="margin: 4px 0;"><strong>Stato attuale:</strong> <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #fde68a; font-weight: bold; color: #92400e;">${ticket.status}</span></p>
                                </div>

                                ${lastMsg ? `
                                <p><strong>Ultimo messaggio inviato:</strong></p>
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 4px; font-style: italic; font-size: 13px; color: #475569;">
                                    "${lastMsg}"
                                </div>
                                ` : ''}

                                <div style="margin-top: 24px; text-align: center;">
                                    <a href="${ticketUrl}" style="background-color: #d97706; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                        Gestisci Ticket nel Gestionale
                                    </a>
                                </div>
                                <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center;">
                                    Questo promemoria automatico viene inviato per i ticket non chiusi entro 48 ore.
                                </p>
                            </div>
                        </div>
                    `;

                    await sendEmail({
                        to: adminEmails,
                        subject: `⚠️ SOLLECITO Ticket: "${ticket.subject}" aperto da oltre 48 ore - ${ticket.clientName}`,
                        html: emailHtml,
                        resendConfig: company.resendApiKey && company.senderEmail ? {
                            apiKey: company.resendApiKey,
                            from: company.senderEmail,
                        } : undefined,
                    }).catch(e => console.error("Error sending overdue ticket alert email:", e));
                }

                ticketsAlerted++;
            }
        }

        // 2. SOLLECITO: Interventi aperti da oltre 1 settimana (7 giorni)
        if (settings.overdueInterventionsAlertEnabled) {
            const allInterventions = await getInterventions(companyId);
            const overdueInterventions = allInterventions.filter(i => 
                !i.isMaintenance && 
                ['Nuovo', 'In corso', 'In Attesa Ricambi'].includes(i.status) &&
                new Date(i.createdAt).getTime() <= sevenDaysAgo.getTime()
            );

            for (const intervention of overdueInterventions) {
                // Verifica se è già stato inviato un sollecito nelle ultime 24 ore per questo intervento
                const { data: recentNotifs } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('related_intervention_id', intervention.id)
                    .eq('type', 'alert')
                    .gte('created_at', twentyFourHoursAgo);

                if (recentNotifs && recentNotifs.length > 0) {
                    continue; // Già inviato oggi, evita spam
                }

                const daysOpen = Math.round((now.getTime() - new Date(intervention.createdAt).getTime()) / (24 * 3600 * 1000));
                const interventionUrl = `${baseUrl}/dashboard/interventions?search=${encodeURIComponent(intervention.id)}`;
                const client = allUsers.find(u => u.id === intervention.clientId);
                const assignedOps = (intervention.assignedOperatorIds || [])
                    .map(id => allUsers.find(u => u.id === id))
                    .filter((u): u is User => !!u);
                const opNames = assignedOps.map(u => u.name).join(', ') || 'Non assegnato';

                // Invia notifica in-app agli admin
                for (const admin of admins) {
                    await addNotification({
                        userId: admin.id,
                        companyId,
                        message: `⚠️ SOLLECITO: L'intervento #${intervention.id} "${intervention.title}" è aperto da oltre una settimana (${daysOpen} giorni)!`,
                        type: 'alert',
                        relatedInterventionId: intervention.id,
                    }).catch(e => console.error("Error adding in-app alert for intervention:", e));
                }

                // Invia notifica in-app ed email ai tecnici assegnati se l'opzione è attiva e non disattivata per l'operatore
                if (settings.notifyAssignedOperatorsOnOverdue && assignedOps.length > 0) {
                    for (const op of assignedOps) {
                        const opPref = getOperatorNotificationPreferences(settings, op.id);
                        if (!opPref.assignedAlerts) continue;

                        await addNotification({
                            userId: op.id,
                            companyId,
                            message: `⚠️ SOLLECITO INTERVENTO ASSEGNATO: L'intervento #${intervention.id} "${intervention.title}" è aperto da ${daysOpen} giorni ed è ancora ${intervention.status}!`,
                            type: 'alert',
                            relatedInterventionId: intervention.id,
                        }).catch(e => console.error("Error adding in-app alert for assigned operator:", e));
                    }
                }

                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b;">
                        <div style="background-color: #dc2626; color: white; padding: 18px 24px; border-radius: 8px 8px 0 0;">
                            <h2 style="margin: 0; font-size: 18px;">⚠️ SOLLECITO: Intervento aperto da oltre 1 settimana</h2>
                            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Azienda: ${company.name}</p>
                        </div>
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
                            <p>Gentile utente,</p>
                            <p>L'intervento <strong>#${intervention.id}</strong> è aperto da <strong>${daysOpen} giorni</strong> ed è ancora in lavorazione / non completato:</p>
                            
                            <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
                                <p style="margin: 4px 0;"><strong>Titolo Intervento:</strong> ${intervention.title}</p>
                                <p style="margin: 4px 0;"><strong>Cliente:</strong> ${client?.name || 'N/D'}</p>
                                <p style="margin: 4px 0;"><strong>Data Creazione:</strong> ${format(new Date(intervention.createdAt), 'dd/MM/yyyy', { locale: it })}</p>
                                <p style="margin: 4px 0;"><strong>Priorità:</strong> ${intervention.priority}</p>
                                <p style="margin: 4px 0;"><strong>Tecnici Assegnati:</strong> ${opNames}</p>
                                <p style="margin: 4px 0;"><strong>Stato Attuale:</strong> <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #fecaca; font-weight: bold; color: #991b1b;">${intervention.status}</span></p>
                            </div>

                            ${intervention.description ? `
                            <p><strong>Descrizione del problema:</strong></p>
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 4px; font-size: 13px; color: #475569;">
                                ${intervention.description}
                            </div>
                            ` : ''}

                            <div style="margin-top: 24px; text-align: center;">
                                <a href="${interventionUrl}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                    Visualizza e Gestisci Intervento
                                </a>
                            </div>
                            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center;">
                                Questo sollecito automatico viene generato per tutti gli interventi aperti da oltre 7 giorni.
                            </p>
                        </div>
                    </div>
                `;

                // Invia email di sollecito agli admin
                if (adminEmails.length > 0) {
                    await sendEmail({
                        to: adminEmails,
                        subject: `⚠️ SOLLECITO Intervento: #${intervention.id} "${intervention.title}" aperto da oltre 1 settimana - ${client?.name || 'Cliente'}`,
                        html: emailHtml,
                        resendConfig: company.resendApiKey && company.senderEmail ? {
                            apiKey: company.resendApiKey,
                            from: company.senderEmail,
                        } : undefined,
                    }).catch(e => console.error("Error sending overdue intervention alert email to admins:", e));
                }

                // Invia email di sollecito anche agli operatori assegnati abilitati
                if (settings.notifyAssignedOperatorsOnOverdue && assignedOps.length > 0) {
                    const eligibleOpEmails = assignedOps
                        .filter(op => getOperatorNotificationPreferences(settings, op.id).assignedAlerts)
                        .map(o => o.email!)
                        .filter(Boolean);

                    if (eligibleOpEmails.length > 0) {
                        await sendEmail({
                            to: eligibleOpEmails,
                            subject: `⚠️ SOLLECITO: Intervento #${intervention.id} a te assegnato aperto da oltre 1 settimana`,
                            html: emailHtml,
                            resendConfig: company.resendApiKey && company.senderEmail ? {
                                apiKey: company.resendApiKey,
                                from: company.senderEmail,
                            } : undefined,
                        }).catch(e => console.error("Error sending overdue intervention alert email to assigned operators:", e));
                    }
                }

                interventionsAlerted++;
            }
        }

        // 3. SOLLECITO: Interventi NON Assegnati aperti da oltre 48 ore
        if (settings.unassignedInterventions48hAlertEnabled && admins.length > 0) {
            const allInterventions = await getInterventions(companyId);
            const unassigned48h = allInterventions.filter(i => 
                !i.isMaintenance && 
                ['Nuovo', 'In corso', 'In Attesa Ricambi'].includes(i.status) &&
                (!i.assignedOperatorIds || i.assignedOperatorIds.length === 0) &&
                new Date(i.createdAt).getTime() <= fortyEightHoursAgo.getTime()
            );

            for (const intervention of unassigned48h) {
                const { data: recentNotifs } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('related_intervention_id', intervention.id)
                    .eq('type', 'alert')
                    .gte('created_at', twentyFourHoursAgo);

                if (recentNotifs && recentNotifs.length > 0) {
                    continue;
                }

                const hoursOpen = Math.round((now.getTime() - new Date(intervention.createdAt).getTime()) / (3600 * 1000));
                const interventionUrl = `${baseUrl}/dashboard/interventions?search=${encodeURIComponent(intervention.id)}`;
                const client = allUsers.find(u => u.id === intervention.clientId);

                // Invia notifica in-app agli admin
                for (const admin of admins) {
                    await addNotification({
                        userId: admin.id,
                        companyId,
                        message: `⚠️ SOLLECITO: L'intervento #${intervention.id} "${intervention.title}" non è ancora stato assegnato ad alcun tecnico da oltre 48 ore (${hoursOpen}h)!`,
                        type: 'alert',
                        relatedInterventionId: intervention.id,
                    }).catch(e => console.error("Error adding in-app alert for unassigned intervention:", e));
                }

                const emailHtml = `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto;">
                        <div style="background-color: #f59e0b; color: white; padding: 18px 24px; border-radius: 8px 8px 0 0;">
                            <h2 style="margin: 0; font-size: 18px;">⚠️ SOLLECITO: Intervento NON Assegnato da oltre 48h</h2>
                            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.95;">${company.name}</p>
                        </div>
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
                            <p>Gentile Responsabile / Tecnico,</p>
                            <p>Il seguente intervento è stato aperto da più di 48 ore (${hoursOpen} ore) e <strong>non è ancora stato assegnato</strong> ad alcun tecnico:</p>
                            
                            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
                                <p style="margin: 4px 0;"><strong>Intervento:</strong> #${intervention.id} - ${intervention.title}</p>
                                <p style="margin: 4px 0;"><strong>Cliente:</strong> ${client?.name || 'Cliente'}</p>
                                <p style="margin: 4px 0;"><strong>Priorità:</strong> ${intervention.priority}</p>
                                <p style="margin: 4px 0;"><strong>Stato:</strong> ${intervention.status}</p>
                                <p style="margin: 4px 0;"><strong>Aperto il:</strong> ${format(new Date(intervention.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}</p>
                            </div>

                            <div style="margin-top: 24px; text-align: center;">
                                <a href="${interventionUrl}" style="background-color: #f59e0b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                    Assegna Tecnico all'Intervento
                                </a>
                            </div>
                            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center;">
                                Questo avviso automatico viene inviato per gli interventi aperti da oltre 48 ore non ancora assegnati.
                            </p>
                        </div>
                    </div>
                `;

                // Invia email di sollecito agli admin
                if (adminEmails.length > 0) {
                    await sendEmail({
                        to: adminEmails,
                        subject: `⚠️ SOLLECITO: Intervento #${intervention.id} non assegnato da oltre 48h - ${client?.name || 'Cliente'}`,
                        html: emailHtml,
                        resendConfig: company.resendApiKey && company.senderEmail ? {
                            apiKey: company.resendApiKey,
                            from: company.senderEmail,
                        } : undefined,
                    }).catch(e => console.error("Error sending unassigned intervention alert email to admins:", e));
                }

                // Invia notifica ed email opzionalmente anche a tutti i tecnici (anche non abilitati)
                if (settings.unassigned48hAlertToOperators) {
                    const allOperators = allUsers.filter(u => u.role === 'Operator');
                    for (const op of allOperators) {
                        await addNotification({
                            userId: op.id,
                            companyId,
                            message: `⚠️ DA ASSEGNARE: L'intervento #${intervention.id} "${intervention.title}" è aperto da oltre 48 ore senza tecnico!`,
                            type: 'alert',
                            relatedInterventionId: intervention.id,
                        }).catch(e => console.error("Error adding in-app alert for unassigned intervention to operator:", e));
                    }

                    const opEmails = allOperators.map(o => o.email!).filter(Boolean);
                    if (opEmails.length > 0) {
                        await sendEmail({
                            to: opEmails,
                            subject: `⚠️ INTERVENTO DA ASSEGNARE: #${intervention.id} "${intervention.title}" aperto da oltre 48h`,
                            html: emailHtml,
                            resendConfig: company.resendApiKey && company.senderEmail ? {
                                apiKey: company.resendApiKey,
                                from: company.senderEmail,
                            } : undefined,
                        }).catch(e => console.error("Error sending unassigned intervention alert email to operators:", e));
                    }
                }

                unassignedAlerted++;
            }
        }

        return {
            success: true,
            ticketsAlerted,
            interventionsAlerted,
            unassignedAlerted,
        };
    } catch (err: any) {
        console.error("Error in sendOverdueTicketsAndInterventionsAlerts:", err);
        return {
            success: false,
            ticketsAlerted: 0,
            interventionsAlerted: 0,
            unassignedAlerted: 0,
            error: err.message || 'Errore imprevisto',
        };
    }
}
