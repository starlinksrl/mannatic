

export type UserRole = 'Creator' |'Admin' | 'Operator' | 'Client';

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
  password?: string; // Only used for creation
  // SMTP settings
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  senderEmail?: string;
}

export type AllowedSector = 'interventions' | 'surveys' | 'maintenance';

export interface User {
  id: string;
  name:string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  password?: string;
  companyId: string;
  address?: string | null;
  phone?: string | null;
  allowedSectors?: AllowedSector[];
}

export interface PasswordResetToken {
    id: string;
    userId: string;
    token: string;
    expiresAt: string;
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

export interface InterventionUpdate {
  date: string;
  description: string;
  userName: string;
}

export interface Intervention {
  id: string;
  title: string;
  clientId: string;
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

    
