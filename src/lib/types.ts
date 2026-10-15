
import { z } from 'zod';
import webpush from 'web-push';

export type UserRole = 'Creator' | 'Distributor' | 'Admin' | 'Operator' | 'Client' | 'DistributorAdmin' | 'DistributorUser';

export type Theme = 'default' | 'ocean' | 'forest' | 'sunset' | 'matrix';
export type Font = 'default' | 'lato' | 'roboto' | 'playfair' | 'sourcecode';


export interface AppConfiguration {
  id: 'global';
  appName?: string;
  appLogoUrl?: string;
  resendApiKey?: string;
  defaultSenderEmail?: string;
  gcsProjectId?: string;
  gcsClientEmail?: string;
  gcsPrivateKey?: string;
  gcsBucketName?: string;
}


export type ViewMode = 'grid' | 'table';

export interface Company {
  id: string;
  name: string;
  creatorId?: string;       // ID of the Creator who created this company
  distributorId?: string;   // ID of the Distributor who manages this company (optional, backward compat)
  logoUrl?: string;
  address?: string;
  city?: string;
  referentName?: string;
  referentPhone?: string;
  createdAt?: string | any;
  vatNumber?: string;
  taxCode?: string;
  phone?: string;
  uniqueCode?: string;
  email?: string;
  platformUrl?: string;
  theme?: Theme;
  font?: Font;
  viewMode?: ViewMode;
  // Resend settings
  resendApiKey?: string;
  senderEmail?: string;
  companyScratchpad?: string;
  cronJobRecipients?: string[] | CompanyNotificationSettings;
  // WhatsApp settings
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappTemplateName?: string;
  whatsappAdminPhone?: string;
}

export interface OperatorNotificationPreference {
  dailySummary?: boolean;     // Receives daily summary of 48h expiring interventions
  weeklySummary?: boolean;    // Receives weekly summary of >7 days overdue interventions
  assignedAlerts?: boolean;   // Receives alerts when interventions assigned to them are overdue
}

export interface CompanyNotificationSettings {
  recipients?: string[];
  operatorPreferences?: Record<string, OperatorNotificationPreference>;
  dailySummaryEnabled?: boolean;
  dailySummaryToAdmins?: boolean;
  dailySummaryToOperators?: boolean;
  weeklySummaryEnabled?: boolean;
  weeklySummaryToAdmins?: boolean;
  weeklySummaryIncludeOperators?: boolean;
  overdueTicketsAlertEnabled?: boolean;
  overdueInterventionsAlertEnabled?: boolean;
  notifyAssignedOperatorsOnOverdue?: boolean;
}

export function getCompanyNotificationSettings(company: Company | null | undefined): Required<Omit<CompanyNotificationSettings, 'operatorPreferences'>> & {
  operatorPreferences: Record<string, OperatorNotificationPreference>;
} {
  const defaults = {
    recipients: [] as string[],
    operatorPreferences: {} as Record<string, OperatorNotificationPreference>,
    dailySummaryEnabled: true,
    dailySummaryToAdmins: true,
    dailySummaryToOperators: true,
    weeklySummaryEnabled: true,
    weeklySummaryToAdmins: true,
    weeklySummaryIncludeOperators: false,
    overdueTicketsAlertEnabled: true,
    overdueInterventionsAlertEnabled: true,
    notifyAssignedOperatorsOnOverdue: true,
  };

  if (!company || !company.cronJobRecipients) {
    return defaults;
  }

  const raw = company.cronJobRecipients;
  if (Array.isArray(raw)) {
    const prefs: Record<string, OperatorNotificationPreference> = {};
    for (const id of raw) {
      prefs[id] = { dailySummary: true, weeklySummary: false, assignedAlerts: true };
    }
    return {
      ...defaults,
      recipients: raw,
      operatorPreferences: prefs,
    };
  }

  if (typeof raw === 'object') {
    const rawObj = raw as any;
    const rawPrefs = (rawObj.operatorPreferences && typeof rawObj.operatorPreferences === 'object')
      ? rawObj.operatorPreferences
      : (rawObj.operator_preferences && typeof rawObj.operator_preferences === 'object')
        ? rawObj.operator_preferences
        : {} as Record<string, OperatorNotificationPreference>;

    return {
      recipients: Array.isArray(rawObj.recipients) ? rawObj.recipients : defaults.recipients,
      operatorPreferences: rawPrefs,
      dailySummaryEnabled: rawObj.dailySummaryEnabled ?? rawObj.daily_summary_enabled ?? defaults.dailySummaryEnabled,
      dailySummaryToAdmins: rawObj.dailySummaryToAdmins ?? rawObj.daily_summary_to_admins ?? defaults.dailySummaryToAdmins,
      dailySummaryToOperators: rawObj.dailySummaryToOperators ?? rawObj.daily_summary_to_operators ?? defaults.dailySummaryToOperators,
      weeklySummaryEnabled: rawObj.weeklySummaryEnabled ?? rawObj.weekly_summary_enabled ?? defaults.weeklySummaryEnabled,
      weeklySummaryToAdmins: rawObj.weeklySummaryToAdmins ?? rawObj.weekly_summary_to_admins ?? defaults.weeklySummaryToAdmins,
      weeklySummaryIncludeOperators: rawObj.weeklySummaryIncludeOperators ?? rawObj.weekly_summary_include_operators ?? defaults.weeklySummaryIncludeOperators,
      overdueTicketsAlertEnabled: rawObj.overdueTicketsAlertEnabled ?? rawObj.overdue_tickets_alert_enabled ?? defaults.overdueTicketsAlertEnabled,
      overdueInterventionsAlertEnabled: rawObj.overdueInterventionsAlertEnabled ?? rawObj.overdue_interventions_alert_enabled ?? defaults.overdueInterventionsAlertEnabled,
      notifyAssignedOperatorsOnOverdue: rawObj.notifyAssignedOperatorsOnOverdue ?? rawObj.notify_assigned_operators_on_overdue ?? defaults.notifyAssignedOperatorsOnOverdue,
    };
  }

  return defaults;
}

export function getOperatorNotificationPreferences(
  settings: ReturnType<typeof getCompanyNotificationSettings>,
  operatorId: string
): Required<OperatorNotificationPreference> {
  const pref = settings.operatorPreferences?.[operatorId];
  if (pref !== undefined) {
    return {
      dailySummary: pref.dailySummary ?? false,
      weeklySummary: pref.weeklySummary ?? false,
      assignedAlerts: pref.assignedAlerts ?? settings.notifyAssignedOperatorsOnOverdue,
    };
  }

  // Fallback se l'operatore non ha preferenze salvate:
  // Se recipients era configurato esplicitamente:
  if (settings.recipients && settings.recipients.length > 0) {
    const inRecipients = settings.recipients.includes(operatorId);
    return {
      dailySummary: inRecipients && settings.dailySummaryToOperators,
      weeklySummary: inRecipients && settings.weeklySummaryIncludeOperators,
      assignedAlerts: settings.notifyAssignedOperatorsOnOverdue,
    };
  }

  // Se nessun operatore specifico era salvato (impostazione predefinita per tutti gli operatori):
  return {
    dailySummary: settings.dailySummaryToOperators,
    weeklySummary: settings.weeklySummaryIncludeOperators,
    assignedAlerts: settings.notifyAssignedOperatorsOnOverdue,
  };
}

export type AllowedSector = 'interventions' | 'new_installations' | 'appointments' | 'maintenance';

export interface User {
  id: string;
  name:string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  companyId: string;
  address?: string | null;
  phone?: string | null;
  website?: string;
  password?: string;
  allowedSectors?: AllowedSector[];
  simplifiedDashboard?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  clientNotes?: string;
  dashboardLayout?: { [key: string]: any };
  pushSubscriptions?: webpush.PushSubscription[];
  scratchpad?: string;
  logoUrl?: string;
  vatNumber?: string;
  taxCode?: string;
  uniqueCode?: string;
  distributorId?: string; // For DistributorAdmin/DistributorUser — links them to their parent distributor
  // WhatsApp settings (for Distributor role)
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappTemplateName?: string;
  whatsappAdminPhone?: string;
}


export interface PasswordResetToken {
    id: string;
    userId: string;
    token: string;
    expiresAt: string;
    companyId: string;
}

export interface AutologinToken {
    id?: string;
    userId: string;
    token: string;
    expiresAt: string;
    companyId: string;
}


export interface Client {
  id: string;
  name: string;
  companyId: string;
  address?: string | null;
  phone?: string | null;
}

export interface Equipment {
  id: string;
  name: string;
  clientId: string;
  companyId: string;
}

export type InterventionStatus = 'Nuovo' | 'In corso' | 'Archiviato' | 'Completato' | 'Annullato' | 'Da Fatturare' | 'Fatturato';
export type InterventionPriority = 'Bassa' | 'Media' | 'Alta' | 'Critica';
export type InterventionType = 'standard' | 'new_installation';

export interface InterventionUpdate {
  date: string;
  description: string;
  userName: string;
  readBy?: string[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string; // Can be a temporary data URI or a permanent GCS URL
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
}

export interface WorkLog {
  id: string;
  operatorId: string;
  operatorName: string;
  startTime: string;
  endTime?: string | null;
  startPosition: GeolocationPosition;
  endPosition?: GeolocationPosition | null;
}


export interface Intervention {
  id: string;
  title: string;
  clientId: string;
  type: InterventionType;
  description?: string;
  priority: InterventionPriority;
  sla: string; // e.g., '4h', '8h', '24h'
  status: InterventionStatus;
  assignedOperatorIds: string[];
  createdAt: string;
  dueDate?: string | null;
  completedAt?: string | null;
  timeSpent?: number | null; // in hours
  materialsUsed?: string | null;
  cost?: number | null;
  photos?: string[];
  clientSignature?: string;
  updates?: InterventionUpdate[];
  attachments?: Attachment[];
  workLogs?: WorkLog[];
  companyId: string;
  isMaintenance?: boolean;
  isFeatured?: boolean;
  featuredOrder?: number;
}

export type ScheduledMaintenanceStatus = 'Pianificato' | 'In corso' | 'Completato' | 'Annullato';

export interface ScheduledMaintenance extends Omit<Intervention, 'status'> {
  isMaintenance: true;
  status: ScheduledMaintenanceStatus;
  recurrenceMonths: number; // New field for recurrence in months
  checklist: { task: string; completed: boolean }[];
  nextDueDate: string;
}

export type AppointmentStatus = 'Pianificato' | 'Eseguito' | 'Annullato' | 'Archiviato';

export interface Appointment {
  id: string;
  title: string;
  clientId: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  date?: string | null;
  assignedOperatorId: string | null;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
  companyId: string;
}


export type NotificationType = 'assignment' | 'status_change' | 'expiry' | 'alert' | 'generic' | 'support_ticket';

export interface Notification {
  id: string;
  userId: string;
  companyId: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedInterventionId?: string;
  type: NotificationType;
}

export type SupportTicketStatus = 'Aperto' | 'In Lavorazione' | 'Chiuso';

export interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  attachments?: Attachment[];
}

export type SupportTicketType = 'client_support' | 'distributor_support';

export interface SupportTicket {
  id: string;
  clientId: string;
  clientName: string;
  companyId: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  status: SupportTicketStatus;
  messages: SupportMessage[];
  ticketType?: SupportTicketType; // 'client_support' (default) | 'distributor_support'
}

export interface DistributorQuote {
  id: string;
  distributorId: string;
  distributorName: string;
  companyId: string;       // Target installer company
  fileName: string;
  gcsPath: string;         // Private GCS object path (e.g. quotes/abc-file.pdf)
  riferimento?: string;    // Reference number / quote title
  scadenza?: string;       // Expiry date (ISO date string YYYY-MM-DD)
  description?: string;
  textContent?: string;    // Extracted PDF text for full-text search
  uploadedAt: string;
}

    
export const ResendConfigSchema = z.object({
  apiKey: z.string().describe('Resend API Key.'),
  from: z.string().email().describe("The sender's email address."),
});

export const SendTestEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the recipient.'),
  resendConfig: ResendConfigSchema.optional().describe('Optional custom Resend configuration; if omitted, domain SMTP is used.'),
});
export type SendTestEmailInput = z.infer<typeof SendTestEmailInputSchema>;

export const SendTestEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendTestEmailOutput = z.infer<typeof SendTestEmailOutputSchema>;

export const TestGcsConnectionInputSchema = z.object({
  projectId: z.string().describe('Google Cloud Project ID.'),
  clientEmail: z.string().email().describe('Service Account client email.'),
  privateKey: z.string().describe('Service Account private key.'),
  bucketName: z.string().describe('The GCS bucket name.'),
});
export type TestGcsConnectionInput = z.infer<typeof TestGcsConnectionInputSchema>;

export const TestGcsConnectionOutputSchema = z.object({
  success: z.boolean().describe('Whether the connection test was successful.'),
  error: z.string().optional().describe('Error message if the test failed.'),
});
export type TestGcsConnectionOutput = z.infer<typeof TestGcsConnectionOutputSchema>;

export const GcsConfigSchema = z.object({
    projectId: z.string(),
    clientEmail: z.string(),
    privateKey: z.string(),
    bucketName: z.string(),
});

export const FetchFileFromGcsInputSchema = z.object({
  filePath: z.string().describe("The path to the file in the bucket."),
  config: GcsConfigSchema,
});
export type FetchFileFromGcsInput = z.infer<typeof FetchFileFromGcsInputSchema>;

export const FetchFileFromGcsOutputSchema = z.object({
  success: z.boolean(),
  dataUri: z.string().optional(),
  error: z.string().optional(),
});
export type FetchFileFromGcsOutput = z.infer<typeof FetchFileFromGcsOutputSchema>;

export const SendSupportTicketNotificationInputSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  ticket: z.custom<SupportTicket>(),
  isNewTicket: z.boolean(),
  ticketLink: z.string().optional(),
  resendConfig: z.custom<any>(),
});
export type SendSupportTicketNotificationInput = z.infer<typeof SendSupportTicketNotificationInputSchema>;

export const SendSupportTicketNotificationOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
export type SendSupportTicketNotificationOutput = z.infer<typeof SendSupportTicketNotificationOutputSchema>;


export const SendAssignedInterventionNotificationInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the recipient (operator).'),
  interventionId: z.string().describe('The ID of the intervention.'),
  interventionTitle: z.string().describe('The title of the intervention.'),
  interventionPriority: z.string().describe('The priority of the intervention.'),
  interventionDueDate: z.string().optional().describe('The due date of the intervention.'),
  clientName: z.string().describe('The name of the client for the intervention.'),
  assignerName: z.string().describe('The name of the user who assigned the intervention.'),
  resendConfig: ResendConfigSchema.describe('Resend configuration for sending the email.'),
  companyId: z.string().describe('The ID of the company.'),
});
export type SendAssignedInterventionNotificationInput = z.infer<typeof SendAssignedInterventionNotificationInputSchema>;

export const SendAssignedInterventionNotificationOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  error: z.string().optional().describe('Error message if sending failed.'),
});
export type SendAssignedInterventionNotificationOutput = z.infer<typeof SendAssignedInterventionNotificationOutputSchema>;

export const SendInterventionReminderEmailInputSchema = z.object({
  recipientEmail: z.string().email(),
  operatorName: z.string(),
  interventionId: z.string(),
  interventionTitle: z.string(),
  clientName: z.string(),
  autologinUrl: z.string().url(),
  resendConfig: ResendConfigSchema,
});
export type SendInterventionReminderEmailInput = z.infer<typeof SendInterventionReminderEmailInputSchema>;

export const SendInterventionReminderEmailOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
export type SendInterventionReminderEmailOutput = z.infer<typeof SendInterventionReminderEmailOutputSchema>;
