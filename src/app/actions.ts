
'use server';
import 'dotenv/config';

import { generateKpiDashboard, GenerateKpiDashboardInput, GenerateKpiDashboardOutput } from '@/ai/flows/generate-kpi-dashboard';
import { sendNotificationEmail, SendNotificationEmailInput, SendNotificationEmailOutput } from '@/ai/flows/send-notification-email';
import { sendExpiryNotification, SendExpiryNotificationInput, SendExpiryNotificationOutput } from '@/ai/flows/send-expiry-notification';
import { sendNewInterventionNotification, SendNewInterventionNotificationInput } from '@/ai/flows/send-new-intervention-notification';
import { sendPasswordResetEmail, SendPasswordResetEmailInput } from '@/ai/flows/send-password-reset-email';
import { sendClientUpdateNotification, SendClientUpdateNotificationInput, SendClientUpdateNotificationOutput } from '@/ai/flows/send-client-update-notification';
import { updateCompany, resetUserPassword, getUserByEmail, createPasswordResetToken, getCompanyByUserId } from '@/lib/data';
import { Company } from '@/lib/types';
import type { SendNewInterventionNotificationOutput } from '@/ai/flows/send-new-intervention-notification';

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

export async function triggerClientUpdateNotification(input: SendClientUpdateNotificationInput): Promise<SendClientUpdateNotificationOutput> {
    try {
        const result = await sendClientUpdateNotification(input);
        return result;
    } catch (error: any) {
        console.error("Error sending client update notification email:", error);
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
