'use server';

import { generateKpiDashboard, GenerateKpiDashboardInput, GenerateKpiDashboardOutput } from '@/ai/flows/generate-kpi-dashboard';
import { sendNotificationEmail, SendNotificationEmailInput, SendNotificationEmailOutput } from '@/ai/flows/send-notification-email';

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
