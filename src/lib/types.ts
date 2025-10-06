

import { z } from 'zod';

export type UserRole = 'Creator' |'Admin' | 'Operator' | 'Client';

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


export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  vatNumber?: string;
  taxCode?: string;
  phone?: string;
  uniqueCode?: string;
  email?: string;
  platformUrl?: string;
  // Resend settings
  resendApiKey?: string;
  senderEmail?: string;
}

export type AllowedSector = 'interventions' | 'surveys' | 'maintenance';

export interface User {
  id: string;
  name:string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  companyId: string;
  address?: string | null;
  phone?: string | null;
  password?: string;
  allowedSectors?: AllowedSector[];
  latitude?: number | null;
  longitude?: number | null;
  clientNotes?: string;
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

export type InterventionStatus = 'Nuovo' | 'In corso' | 'In attesa' | 'Completato' | 'Annullato' | 'Pianificato' | 'Da Fatturare' | 'Fatturato';
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
  assignedOperatorId: string | null;
  createdAt: string;
  dueDate?: string | null;
  completedAt?: string | null;
  timeSpent?: number | null; // in hours
  materialsUsed?: string | null;
  photos?: string[];
  clientSignature?: string;
  updates?: InterventionUpdate[];
  attachments?: Attachment[];
  workLogs?: WorkLog[];
  companyId: string;
  isMaintenance?: boolean;
}

export type ScheduledMaintenanceStatus = 'Pianificato' | 'In corso' | 'Completato' | 'Annullato';

export interface ScheduledMaintenance extends Intervention {
  isMaintenance: true;
  status: ScheduledMaintenanceStatus;
  recurrenceMonths: number; // New field for recurrence in months
  checklist: { task: string; completed: boolean }[];
  nextDueDate: string;
}

export type SurveyStatus = 'Pianificato' | 'Eseguito' | 'Annullato';

export interface Survey {
  id: string;
  title: string;
  clientId: string;
  address: string;
  date: string;
  assignedOperatorId: string | null;
  notes?: string;
  status: SurveyStatus;
  createdAt: string;
  companyId: string;
}


export type NotificationType = 'assignment' | 'status_change' | 'expiry' | 'alert' | 'generic';

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
    
export const ResendConfigSchema = z.object({
  apiKey: z.string().describe('Resend API Key.'),
  from: z.string().email().describe("The sender's email address."),
});

export const SendTestEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe('The email address of the recipient.'),
  resendConfig: ResendConfigSchema.describe('Resend API configuration for sending the email.'),
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
