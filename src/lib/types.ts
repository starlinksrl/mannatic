export type UserRole = 'Admin' | 'Operator' | 'Client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  password?: string;
}

export interface Client {
  id: string;
  name: string;
}

export interface Equipment {
  id: string;
  name: string;
  clientId: string;
}

export type InterventionStatus = 'Nuovo' | 'In corso' | 'In attesa' | 'Completato' | 'Annullato' | 'Pianificato';
export type InterventionPriority = 'Bassa' | 'Media' | 'Alta' | 'Critica';

export interface Intervention {
  id: string;
  title: string;
  clientId: string;
  equipmentId: string;
  description: string;
  priority: InterventionPriority;
  sla: string; // e.g., '4h', '8h', '24h'
  status: InterventionStatus;
  assignedOperatorId: string | null;
  createdAt: string;
  dueDate: string;
  completedAt?: string;
  timeSpent?: number; // in hours
  materialsUsed?: { name: string; quantity: number }[];
  photos?: string[];
  clientSignature?: string;
}

export interface ScheduledMaintenance extends Intervention {
  isMaintenance: true;
  periodicity: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceMonths: number; // New field for recurrence in months
  checklist: { task: string; completed: boolean }[];
  nextDueDate: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}
