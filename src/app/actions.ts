
'use server';
import 'dotenv/config';

import { generateKpiDashboard, GenerateKpiDashboardInput, GenerateKpiDashboardOutput } from '@/ai/flows/generate-kpi-dashboard';
import { sendNotificationEmail, SendNotificationEmailInput, SendNotificationEmailOutput } from '@/ai/flows/send-notification-email';
import { sendExpiryNotification, SendExpiryNotificationInput, SendExpiryNotificationOutput } from '@/ai/flows/send-expiry-notification';
import { sendNewInterventionNotification, SendNewInterventionNotificationInput } from '@/ai/flows/send-new-intervention-notification';
import { suggestInterventionTitle, SuggestInterventionTitleInput, SuggestInterventionTitleOutput } from '@/ai/flows/suggest-intervention-title';
import { updateCompany } from '@/lib/data';
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


export async function getInterventionTitleSuggestions(input: SuggestInterventionTitleInput): Promise<SuggestInterventionTitleOutput> {
    try {
        const result = await suggestInterventionTitle(input);
        return result;
    } catch (error) {
        console.error("Error getting intervention title suggestions:", error);
        return { suggestions: [] };
    }
}
