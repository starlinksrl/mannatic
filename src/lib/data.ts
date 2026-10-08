import { 
  User, Client, Intervention, ScheduledMaintenance, Notification, UserRole, 
  InterventionPriority, InterventionStatus, Company, Appointment, AppointmentStatus, 
  PasswordResetToken, AllowedSector, InterventionUpdate, AppConfiguration, Attachment, 
  InterventionType, WorkLog, AutologinToken, SupportTicket, SupportMessage, 
  SupportTicketStatus, DistributorQuote 
} from './types';

export type { 
  User, Client, Intervention, ScheduledMaintenance, Notification, UserRole, 
  InterventionPriority, InterventionStatus, Company, Appointment, AppointmentStatus, 
  PasswordResetToken, AllowedSector, InterventionUpdate, AppConfiguration, Attachment, 
  InterventionType, WorkLog, AutologinToken, SupportTicket, SupportMessage, 
  SupportTicketStatus, DistributorQuote 
};

import { subDays, addDays, addMonths, addWeeks, isWithinInterval, startOfToday, differenceInHours, isAfter, differenceInMinutes, addHours } from 'date-fns';
import { supabase } from './supabase';
import { triggerNewInterventionNotification, sendClientUpdateEmail, triggerSupportTicketNotification, sendPushNotification, triggerAssignedInterventionNotification } from '@/app/actions';
import { generateShortId } from './utils';
import { v4 as uuidv4 } from 'uuid';
import { uploadFileToSupabase } from './supabase-storage';
import { sendWhatsAppTicketNotification } from './whatsapp';
import { Resend } from 'resend';
import { CREATOR_USER_ID } from './constants';

// --- KEY MAPPING UTILITIES ---

function camelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function snakeCaseKey(key: string): string {
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function mapKeysToCamel<T = any>(obj: any): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const res: any = {};
  for (const key of Object.keys(obj)) {
    res[camelCaseKey(key)] = obj[key];
  }
  return res as T;
}

export function mapKeysToSnake(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const res: any = {};
  for (const key of Object.keys(obj)) {
    res[snakeCaseKey(key)] = obj[key];
  }
  return res;
}

// --- APP CONFIGURATION ---

export async function getAppConfiguration(): Promise<AppConfiguration | null> {
    try {
        const { data, error } = await supabase.from('app_configurations').select('*').eq('id', 'global').maybeSingle();
        if (error || !data) return null;
        return mapKeysToCamel<AppConfiguration>(data);
    } catch (error) {
        console.error("Error fetching app configuration:", error);
        return null;
    }
}

export async function updateAppConfiguration(config: Partial<Omit<AppConfiguration, 'id'>>): Promise<AppConfiguration | null> {
    try {
        const configToSave: Partial<AppConfiguration> = { ...config };
        
        if (!config.gcsPrivateKey || config.gcsPrivateKey.trim() === '' || config.gcsPrivateKey === '••••••••') {
            delete configToSave.gcsPrivateKey;
        }

        if (!config.resendApiKey || config.resendApiKey.trim() === '' || config.resendApiKey === '••••••••') {
            delete configToSave.resendApiKey;
        }

        const snakeData = mapKeysToSnake(configToSave);
        snakeData.id = 'global';
        snakeData.updated_at = new Date().toISOString();

        const { data, error } = await supabase.from('app_configurations').upsert(snakeData).select().single();
        if (error || !data) return null;
        return mapKeysToCamel<AppConfiguration>(data);
    } catch (error) {
        console.error("Error updating app configuration:", error);
        return null;
    }
}

// --- GENERIC DOCUMENT MANAGEMENT ---
export async function updateDocument(tableName: string, docId: string, data: Partial<any>): Promise<void> {
    try {
        const snakeData = mapKeysToSnake(data);
        delete snakeData.id;
        const { error } = await supabase.from(tableName).update(snakeData).eq('id', docId);
        if (error) throw error;
    } catch (error) {
        console.error(`Error updating document in ${tableName}:`, error);
        throw new Error(`Failed to update document in ${tableName}.`);
    }
}

// --- COMPANY MANAGEMENT ---

export async function getCompanies(creatorId?: string, fetchAll: boolean = false): Promise<Company[]> {
    try {
        let query = supabase.from('companies').select('*');
        if (!fetchAll && creatorId) {
            query = query.eq('creator_id', creatorId);
        } else if (!fetchAll && !creatorId) {
            return [];
        }
        const { data, error } = await query;
        if (error || !data) return [];
        return data.map(item => mapKeysToCamel<Company>(item));
    } catch (error) {
        console.error("Error fetching companies:", error);
        return [];
    }
}

export async function getCompaniesByDistributorId(distributorId: string): Promise<Company[]> {
    if (!distributorId) return [];
    try {
        const { data, error } = await supabase.from('companies').select('*').eq('distributor_id', distributorId);
        if (error || !data) return [];
        return data.map(item => mapKeysToCamel<Company>(item));
    } catch (error) {
        console.error("Error fetching companies by distributorId:", error);
        return [];
    }
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
    if (!companyId) return null;
    try {
        const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
        if (error || !data) return null;
        return mapKeysToCamel<Company>(data);
    } catch (error) {
        console.error("Error fetching company by ID:", error);
        return null;
    }
}

export async function getCompanyByUserId(userId: string): Promise<Company | null> {
    const user = await getUserById(userId);
    if (!user || user.role === 'Creator' || !user.companyId) return null;
    return getCompanyById(user.companyId);
}

export async function addCompany(companyData: Partial<Company> & { adminName: string, email: string, password?: string, creatorId?: string | null }): Promise<{ company: Company, adminUser: User }> {
    const existingUser = await getUserByEmail(companyData.email!);
    if (existingUser) {
        throw new Error('Un utente con questa email esiste già.');
    }

    try {
        const appConfig = await getAppConfiguration();
        
        const companyPayload: Omit<Company, 'id'> = {
            name: companyData.name!,
            creatorId: companyData.creatorId || undefined,
            distributorId: companyData.distributorId || undefined,
            address: companyData.address || '',
            city: companyData.city || '',
            referentName: companyData.referentName || '',
            referentPhone: companyData.referentPhone || '',
            createdAt: new Date().toISOString(),
            logoUrl: companyData.logoUrl || '',
            vatNumber: companyData.vatNumber || '',
            taxCode: companyData.taxCode || '',
            phone: companyData.phone || '',
            uniqueCode: companyData.uniqueCode || '',
            email: companyData.email || '',
            platformUrl: companyData.platformUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://work.mannatec.it',
            resendApiKey: appConfig?.resendApiKey || undefined,
            senderEmail: appConfig?.defaultSenderEmail || undefined,
        };

        const snakeData = mapKeysToSnake(companyPayload);
        const { data, error } = await supabase.from('companies').insert(snakeData).select().single();
        if (error || !data) throw new Error(error?.message || "Failed to add company.");

        const company = mapKeysToCamel<Company>(data);

        const adminUser = await addUser({
            name: companyData.adminName,
            email: companyData.email!,
            password: companyData.password!,
            role: 'Admin',
            companyId: company.id
        });
        
        return { company, adminUser };

    } catch (error) {
        console.error("Error adding company:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to add company.");
    }
}

export async function updateCompany(id: string, updatedData: Partial<Company>): Promise<Company | null> {
    try {
        const dataToSave = { ...updatedData };
        if (dataToSave.resendApiKey === '') {
            delete dataToSave.resendApiKey;
        }
        if (dataToSave.whatsappAccessToken === '') {
            delete dataToSave.whatsappAccessToken;
        }

        const snakeData = mapKeysToSnake(dataToSave);
        delete snakeData.id;

        const { data, error } = await supabase.from('companies').update(snakeData).eq('id', id).select().single();
        if (error || !data) return null;
        return mapKeysToCamel<Company>(data);
    } catch (error) {
        console.error("Error updating company:", error);
        return null;
    }
}

export async function deleteCompanyAndSubcollections(companyId: string): Promise<void> {
    try {
        await supabase.from('users').delete().eq('company_id', companyId);
        await supabase.from('interventions').delete().eq('company_id', companyId);
        await supabase.from('notifications').delete().eq('company_id', companyId);
        await supabase.from('appointments').delete().eq('company_id', companyId);
        await supabase.from('password_reset_tokens').delete().eq('company_id', companyId);
        await supabase.from('support_tickets').delete().eq('company_id', companyId);
        await supabase.from('distributor_quotes').delete().eq('company_id', companyId);
        await supabase.from('companies').delete().eq('id', companyId);
    } catch (error) {
        console.error("Error deleting company and subcollections:", error);
        throw new Error("Failed to delete company.");
    }
}

// --- USER MANAGEMENT ---

export async function getUsers(companyId?: string): Promise<User[]> {
  try {
    let query = supabase.from('users').select('*');
    if (companyId) {
        query = query.eq('company_id', companyId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(u => mapKeysToCamel<User>(u));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function getAllUsers(): Promise<User[]> {
   try {
    const { data, error } = await supabase.from('users').select('*');
    if (error || !data) return [];
    return data.map(u => mapKeysToCamel<User>(u));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (!email) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.from('users').select('*').ilike('email', cleanEmail).maybeSingle();
    if (error || !data) return null;
    return mapKeysToCamel<User>(data);
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
    if (!id) return null;
    try {
        const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
        if (error || !data) return null;
        return mapKeysToCamel<User>(data);
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        return null;
    }
}

export async function addUser(userData: Partial<Omit<User, 'avatarUrl'>>): Promise<User> {
    if (userData.companyId && userData.name) {
        const companyUsers = await getUsers(userData.companyId);
        const existingByName = companyUsers.find(u => u.name.trim().toLowerCase() === userData.name!.trim().toLowerCase());
        if (existingByName) {
            return existingByName;
        }
    }

    if (!userData.email) {
        const cleanSlug = (userData.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
        userData.email = `cliente_${cleanSlug}_${Date.now()}@placeholder.local`;
    }

    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
        throw new Error('Un utente con questa email esiste già.');
    }
    
    const id = userData.id || uuidv4();
    const userPayload: User = {
        id,
        name: userData.name || '',
        email: userData.email.toLowerCase(),
        role: userData.role || 'Client',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name || 'User')}`,
        companyId: userData.companyId || '',
        address: userData.address || null,
        phone: userData.phone || null,
        website: userData.website || '',
        password: userData.password || '',
        allowedSectors: userData.allowedSectors || [],
        simplifiedDashboard: userData.simplifiedDashboard || false,
        latitude: userData.latitude || null,
        longitude: userData.longitude || null,
        clientNotes: userData.clientNotes || '',
        dashboardLayout: userData.dashboardLayout || {},
        pushSubscriptions: userData.pushSubscriptions || [],
        scratchpad: userData.scratchpad || '',
        logoUrl: userData.logoUrl || '',
        vatNumber: userData.vatNumber || '',
        taxCode: userData.taxCode || '',
        uniqueCode: userData.uniqueCode || '',
        distributorId: userData.distributorId || undefined,
        whatsappAccessToken: userData.whatsappAccessToken || undefined,
        whatsappPhoneNumberId: userData.whatsappPhoneNumberId || undefined,
        whatsappTemplateName: userData.whatsappTemplateName || undefined,
        whatsappAdminPhone: userData.whatsappAdminPhone || undefined,
    };

    const snakeData = mapKeysToSnake(userPayload);
    const { data, error } = await supabase.from('users').insert(snakeData).select().single();
    if (error || !data) throw new Error(error?.message || "Errore durante il salvataggio dell'utente.");

    return mapKeysToCamel<User>(data);
}

export async function updateUser(id: string, updatedData: Partial<User>): Promise<User | null> {
    try {
        const payload = { ...updatedData };
        if (payload.email) {
            payload.email = payload.email.trim().toLowerCase();
        }
        const snakeData = mapKeysToSnake(payload);
        delete snakeData.id;
        const { data, error } = await supabase.from('users').update(snakeData).eq('id', id).select().single();
        if (error || !data) return null;
        return mapKeysToCamel<User>(data);
    } catch (error) {
        console.error("Error updating user:", error);
        return null;
    }
}

export async function deleteUser(id: string): Promise<void> {
    try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new Error("Impossibile eliminare l'utente.");
    }
}

export async function authenticateUser(email: string): Promise<User | null> {
    return getUserByEmail(email);
}

// --- INTERVENTION MANAGEMENT ---

export async function getInterventions(companyId?: string): Promise<Intervention[]> {
    try {
        let query = supabase.from('interventions').select('*').eq('is_maintenance', false);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query;
        if (error || !data) return [];
        return data.map(item => mapKeysToCamel<Intervention>(item));
    } catch (error) {
        console.error("Error fetching interventions:", error);
        return [];
    }
}

export async function getInterventionById(id: string): Promise<Intervention | null> {
    try {
        const { data, error } = await supabase.from('interventions').select('*').eq('id', id).maybeSingle();
        if (error || !data) return null;
        return mapKeysToCamel<Intervention>(data);
    } catch (error) {
        console.error("Error fetching intervention by ID:", error);
        return null;
    }
}

const ALLOWED_INTERVENTION_COLUMNS = new Set([
  'id', 'title', 'client_id', 'type', 'description', 'priority', 'sla', 'status',
  'assigned_operator_ids', 'created_at', 'due_date', 'completed_at', 'time_spent',
  'materials_used', 'cost', 'photos', 'client_signature', 'updates', 'attachments',
  'work_logs', 'company_id', 'is_maintenance', 'is_featured', 'featured_order',
  'recurrence_months', 'checklist', 'next_due_date'
]);

function filterInterventionColumns(snakeObj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(snakeObj)) {
    if (ALLOWED_INTERVENTION_COLUMNS.has(key)) {
      result[key] = snakeObj[key];
    }
  }
  return result;
}

export async function addIntervention(interventionData: Omit<Intervention, 'id' | 'createdAt'>): Promise<Intervention> {
    try {
        const payload = {
            ...interventionData,
            createdAt: new Date().toISOString(),
            isMaintenance: false,
        };
        const snakeData = filterInterventionColumns(mapKeysToSnake(payload));
        delete snakeData.id;

        const { data, error } = await supabase.from('interventions').insert(snakeData).select().single();
        if (error || !data) {
            console.error("Error inserting intervention in Supabase:", error);
            throw new Error(error?.message || "Failed to add intervention.");
        }

        const intervention = mapKeysToCamel<Intervention>(data);

        // Notifications logic
        try {
            triggerNewInterventionNotification(intervention).catch(err => console.error("Error triggering new intervention notification:", err));
            if (intervention.assignedOperatorIds && intervention.assignedOperatorIds.length > 0) {
                const company = await getCompanyById(intervention.companyId);
                const assignerName = company?.name || 'Amministratore';
                const client = await getUserById(intervention.clientId);
                const clientName = client?.name || 'Cliente';

                for (const opId of intervention.assignedOperatorIds) {
                    const operator = await getUserById(opId);
                    if (operator && operator.email) {
                        triggerAssignedInterventionNotification({
                            recipientEmail: operator.email,
                            interventionId: intervention.id,
                            interventionTitle: intervention.title,
                            interventionPriority: intervention.priority,
                            interventionDueDate: intervention.dueDate || undefined,
                            clientName: clientName,
                            assignerName: assignerName,
                            resendConfig: {
                                apiKey: company?.resendApiKey || '',
                                from: company?.senderEmail || ''
                            },
                            companyId: intervention.companyId
                        }).catch(err => console.error(`Error triggering assignment notification for operator ${opId}:`, err));
                    }
                }
            }
        } catch (notifErr) {
            console.error("Notification error:", notifErr);
        }

        return intervention;
    } catch (error) {
        console.error("Error adding intervention:", error);
        throw new Error("Failed to add intervention.");
    }
}

export async function updateIntervention(id: string, updatedData: Partial<Intervention>): Promise<Intervention | null> {
    try {
        const snakeData = filterInterventionColumns(mapKeysToSnake(updatedData));
        delete snakeData.id;
        delete snakeData.created_at;

        const { data, error } = await supabase.from('interventions').update(snakeData).eq('id', id).select().single();
        if (error || !data) {
            console.error("Error updating intervention in Supabase:", error);
            return null;
        }
        return mapKeysToCamel<Intervention>(data);
    } catch (error) {
        console.error("Error updating intervention:", error);
        return null;
    }
}

export async function deleteIntervention(id: string): Promise<boolean> {
    try {
        const { error } = await supabase.from('interventions').delete().eq('id', id);
        if (error) {
            console.error("Error deleting intervention in Supabase:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error deleting intervention:", error);
        return false;
    }
}

// --- SCHEDULED MAINTENANCE MANAGEMENT ---

export async function getScheduledMaintenances(companyId?: string): Promise<ScheduledMaintenance[]> {
    try {
        let query = supabase.from('interventions').select('*').eq('is_maintenance', true);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query;
        if (error || !data) return [];
        return data.map(item => mapKeysToCamel<ScheduledMaintenance>(item));
    } catch (error) {
        console.error("Error fetching scheduled maintenances:", error);
        return [];
    }
}

export async function addScheduledMaintenance(data: Omit<ScheduledMaintenance, 'id' | 'createdAt' | 'isMaintenance'>): Promise<ScheduledMaintenance> {
    try {
        const cleanPayload = { ...data };
        delete (cleanPayload as any).dueTime;
        delete (cleanPayload as any).assignedOperatorId;
        delete (cleanPayload as any).periodicity;
        const payload = {
            ...cleanPayload,
            createdAt: new Date().toISOString(),
            isMaintenance: true,
        };
        const snakeData = mapKeysToSnake(payload);
        const { data: result, error } = await supabase.from('interventions').insert(snakeData).select().single();
        if (error || !result) throw new Error(error?.message || "Failed to add scheduled maintenance.");
        return mapKeysToCamel<ScheduledMaintenance>(result);
    } catch (error) {
        console.error("Error adding scheduled maintenance:", error);
        throw new Error("Failed to add scheduled maintenance.");
    }
}

export async function updateScheduledMaintenance(id: string, data: Partial<ScheduledMaintenance>): Promise<ScheduledMaintenance | null> {
    try {
        const cleanPayload = { ...data };
        delete (cleanPayload as any).dueTime;
        delete (cleanPayload as any).assignedOperatorId;
        delete (cleanPayload as any).periodicity;
        const snakeData = mapKeysToSnake(cleanPayload);
        delete snakeData.id;
        const { data: result, error } = await supabase.from('interventions').update(snakeData).eq('id', id).select().single();
        if (error || !result) return null;
        return mapKeysToCamel<ScheduledMaintenance>(result);
    } catch (error) {
        console.error("Error updating scheduled maintenance:", error);
        return null;
    }
}

export async function deleteScheduledMaintenance(id: string): Promise<boolean> {
    try {
        const { error } = await supabase.from('interventions').delete().eq('id', id);
        if (error) {
            console.error("Error deleting scheduled maintenance in Supabase:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error deleting scheduled maintenance:", error);
        return false;
    }
}

// --- SURVEY MANAGEMENT ---

export async function getSurveys(companyId?: string): Promise<any[]> {
    try {
        let query = supabase.from('surveys').select('*');
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query;
        if (error || !data) return [];
        return data.map(item => mapKeysToCamel(item));
    } catch (error) {
        console.error("Error fetching surveys:", error);
        return [];
    }
}

export async function addSurvey(surveyData: any): Promise<any> {
    try {
        const snakeData = mapKeysToSnake({ ...surveyData, createdAt: new Date().toISOString() });
        const { data, error } = await supabase.from('surveys').insert(snakeData).select().single();
        if (error || !data) throw error;
        return mapKeysToCamel(data);
    } catch (error) {
        console.error("Error adding survey:", error);
        throw new Error("Failed to add survey.");
    }
}

export async function updateSurvey(id: string, updatedData: any): Promise<any> {
    try {
        const snakeData = mapKeysToSnake(updatedData);
        delete snakeData.id;
        const { data, error } = await supabase.from('surveys').update(snakeData).eq('id', id).select().single();
        if (error || !data) return null;
        return mapKeysToCamel(data);
    } catch (error) {
        console.error("Error updating survey:", error);
        return null;
    }
}

export async function deleteSurvey(id: string): Promise<boolean> {
    try {
        const { error } = await supabase.from('surveys').delete().eq('id', id);
        if (error) {
            console.error("Error deleting survey in Supabase:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error deleting survey:", error);
        return false;
    }
}

// --- APPOINTMENTS MANAGEMENT ---

const ALLOWED_APPOINTMENT_COLUMNS = new Set([
  'id', 'title', 'client_id', 'address', 'latitude', 'longitude', 'date',
  'assigned_operator_id', 'notes', 'status', 'created_at', 'company_id'
]);

function filterAppointmentColumns(snakeObj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(snakeObj)) {
    if (ALLOWED_APPOINTMENT_COLUMNS.has(key)) {
      result[key] = snakeObj[key];
    }
  }
  return result;
}

export async function getAppointments(companyId?: string): Promise<Appointment[]> {
    try {
        let query = supabase.from('appointments').select('*');
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query;
        if (error || !data) return [];
        return data.map(item => mapKeysToCamel<Appointment>(item));
    } catch (error) {
        console.error("Error fetching appointments:", error);
        return [];
    }
}

export async function addAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    try {
        const payload = {
            ...appointmentData,
            createdAt: new Date().toISOString(),
        };
        const snakeData = filterAppointmentColumns(mapKeysToSnake(payload));
        const { data, error } = await supabase.from('appointments').insert(snakeData).select().single();
        if (error || !data) throw new Error(error?.message || "Failed to add appointment.");
        return mapKeysToCamel<Appointment>(data);
    } catch (error) {
        console.error("Error adding appointment:", error);
        throw new Error("Failed to add appointment.");
    }
}

export async function updateAppointment(id: string, updatedData: Partial<Appointment>): Promise<Appointment | null> {
    try {
        const snakeData = filterAppointmentColumns(mapKeysToSnake(updatedData));
        delete snakeData.id;
        delete snakeData.created_at;
        const { data, error } = await supabase.from('appointments').update(snakeData).eq('id', id).select().single();
        if (error || !data) return null;
        return mapKeysToCamel<Appointment>(data);
    } catch (error) {
        console.error("Error updating appointment:", error);
        return null;
    }
}

export async function deleteAppointment(id: string): Promise<boolean> {
    try {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) {
            console.error("Error deleting appointment in Supabase:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error deleting appointment:", error);
        return false;
    }
}

// --- NOTIFICATIONS MANAGEMENT ---

export async function getNotifications(userId?: string, companyId?: string): Promise<Notification[]> {
    try {
        let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
        if (userId && companyId) {
            query = query.eq('company_id', companyId).or(`user_id.eq.${userId},user_id.is.null`);
        } else if (userId) {
            query = query.eq('user_id', userId);
        } else if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query;
        if (error || !data) return [];
        return data.map(item => mapKeysToCamel<Notification>(item));
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
}

export async function addNotification(notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    try {
        const payload = {
            ...notificationData,
            read: false,
            createdAt: new Date().toISOString(),
        };
        const snakeData = mapKeysToSnake(payload);
        const { data, error } = await supabase.from('notifications').insert(snakeData).select().single();
        if (error || !data) throw new Error(error?.message || "Failed to add notification.");
        return mapKeysToCamel<Notification>(data);
    } catch (error) {
        console.error("Error adding notification:", error);
        throw new Error("Failed to add notification.");
    }
}

export async function markNotificationAsRead(id: string): Promise<void> {
    try {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
}

export async function markNotificationsAsRead(userId: string, notificationIds?: string[]): Promise<void> {
    try {
        if (notificationIds && notificationIds.length > 0) {
            await supabase.from('notifications').update({ read: true }).in('id', notificationIds);
        } else {
            await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
        }
    } catch (error) {
        console.error("Error marking notifications as read:", error);
    }
}

export async function deleteNotification(id: string): Promise<void> {
    try {
        await supabase.from('notifications').delete().eq('id', id);
    } catch (error) {
        console.error("Error deleting notification:", error);
    }
}

// --- PASSWORD RESET & AUTOLOGIN TOKENS ---

export async function createPasswordResetToken(userId: string, companyId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    try {
        const snakeData = {
            user_id: userId,
            company_id: companyId,
            token,
            expires_at: expiresAt,
        };
        await supabase.from('password_reset_tokens').insert(snakeData);
        return token;
    } catch (error) {
        console.error("Error creating password reset token:", error);
        throw new Error("Failed to create password reset token.");
    }
}

export async function getPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    try {
        const { data, error } = await supabase.from('password_reset_tokens').select('*').eq('token', token).maybeSingle();
        if (error || !data) return null;
        return mapKeysToCamel<PasswordResetToken>(data);
    } catch (error) {
        console.error("Error fetching password reset token:", error);
        return null;
    }
}

export async function deletePasswordResetToken(tokenId: string): Promise<void> {
    try {
        await supabase.from('password_reset_tokens').delete().eq('id', tokenId);
    } catch (error) {
        console.error("Error deleting password reset token:", error);
    }
}

export async function resetUserPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
        const tokenObj = await getPasswordResetToken(token);
        if (!tokenObj) {
            return { success: false, message: 'Token non valido o scaduto.' };
        }
        if (new Date(tokenObj.expiresAt) < new Date()) {
            await deletePasswordResetToken(tokenObj.id);
            return { success: false, message: 'Token scaduto.' };
        }
        const user = await getUserById(tokenObj.userId);
        if (!user) {
            return { success: false, message: 'Utente non trovato.' };
        }
        await updateUser(user.id, { password: newPassword });
        await deletePasswordResetToken(tokenObj.id);
        return { success: true, message: 'Password aggiornata con successo!' };
    } catch (error: any) {
        console.error('Error resetting user password:', error);
        return { success: false, message: 'Impossibile aggiornare la password.' };
    }
}

export async function createAutologinToken(userId: string, companyId?: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600000).toISOString(); // 7 days
    try {
        let resolvedCompanyId = companyId;
        if (!resolvedCompanyId) {
            const user = await getUserById(userId);
            resolvedCompanyId = user?.companyId || 'none';
        }
        const snakeData = {
            user_id: userId,
            company_id: resolvedCompanyId,
            token,
            expires_at: expiresAt,
        };
        const { error } = await supabase.from('autologin_tokens').insert(snakeData);
        if (error) {
            console.error("Supabase error creating autologin token:", error);
            throw new Error(error.message || "Failed to create autologin token.");
        }
        return token;
    } catch (error) {
        console.error("Error creating autologin token:", error);
        throw new Error("Failed to create autologin token.");
    }
}

export async function getAutologinToken(token: string): Promise<AutologinToken | null> {
    try {
        const { data, error } = await supabase.from('autologin_tokens').select('*').eq('token', token).maybeSingle();
        if (error || !data) return null;
        return mapKeysToCamel<AutologinToken>(data);
    } catch (error) {
        console.error("Error fetching autologin token:", error);
        return null;
    }
}

export async function deleteAutologinToken(tokenId: string): Promise<void> {
    try {
        await supabase.from('autologin_tokens').delete().eq('id', tokenId);
    } catch (error) {
        console.error("Error deleting autologin token:", error);
    }
}

// --- SUPPORT TICKETS MANAGEMENT ---

export async function getSupportTickets(companyId?: string, clientId?: string): Promise<SupportTicket[]> {
    try {
        let query = supabase.from('support_tickets').select('*');
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        if (clientId) {
            query = query.eq('client_id', clientId);
        }
        const { data, error } = await query;
        if (error || !data) return [];
        return data.map(item => mapKeysToCamel<SupportTicket>(item));
    } catch (error) {
        console.error("Error fetching support tickets:", error);
        return [];
    }
}

export async function getSupportTicketById(ticketId: string): Promise<SupportTicket | null> {
    try {
        const { data, error } = await supabase.from('support_tickets').select('*').eq('id', ticketId).maybeSingle();
        if (error || !data) return null;
        return mapKeysToCamel<SupportTicket>(data);
    } catch (error) {
        console.error("Error fetching support ticket by ID:", error);
        return null;
    }
}

export async function sendSupportTicketEmailNotification(companyId: string, ticket: SupportTicket, isNewTicket: boolean, sender: User): Promise<void> {
    try {
        const company = await getCompanyById(companyId);
        if (!company) return;

        const usersInCompany = await getUsers(companyId);
        const adminUsers = usersInCompany.filter(u => u.role === 'Admin');

        const recipients = isNewTicket 
            ? adminUsers 
            : (sender.role === 'Admin' ? usersInCompany.filter(u => u.id === ticket.clientId) : adminUsers);

        const resendConfig = (company.resendApiKey && company.senderEmail) ? {
            apiKey: company.resendApiKey,
            from: company.senderEmail
        } : undefined;

        for (const recipient of recipients) {
            if (recipient.email) {
                await triggerSupportTicketNotification({
                    recipientEmail: recipient.email,
                    recipientName: recipient.name,
                    ticket: ticket,
                    isNewTicket: isNewTicket,
                    ticketLink: `${company.platformUrl || process.env.NEXT_PUBLIC_APP_URL}/dashboard/support?ticketId=${ticket.id}`,
                    resendConfig
                });
            }
        }
    } catch (error) {
        console.error("Error sending support ticket notification:", error);
    }
}

export async function addSupportTicket(ticketData: {
    clientId: string;
    clientName: string;
    companyId: string;
    subject: string;
    messageText: string;
    ticketType?: 'client_support' | 'distributor_support';
    attachments?: Attachment[];
}): Promise<SupportTicket> {
    const now = new Date().toISOString();
    const initialMessage: SupportMessage = {
        id: uuidv4(),
        senderId: ticketData.clientId,
        senderName: ticketData.clientName,
        text: ticketData.messageText,
        createdAt: now,
        attachments: ticketData.attachments || [],
    };

    const newTicketPayload = {
        clientId: ticketData.clientId,
        clientName: ticketData.clientName,
        companyId: ticketData.companyId,
        subject: ticketData.subject,
        status: 'Aperto' as SupportTicketStatus,
        createdAt: now,
        updatedAt: now,
        messages: [initialMessage],
        ticketType: ticketData.ticketType || 'client_support',
    };

    const snakeData = mapKeysToSnake(newTicketPayload);
    const { data, error } = await supabase.from('support_tickets').insert(snakeData).select().single();
    if (error || !data) throw new Error(error?.message || "Failed to create support ticket.");

    const createdTicket = mapKeysToCamel<SupportTicket>(data);

    try {
        const clientUser = await getUserById(ticketData.clientId);
        if (clientUser) {
            await sendSupportTicketEmailNotification(ticketData.companyId, createdTicket, true, clientUser);
        }

        // Invia notifica in-app sulla campanella a tutti gli amministratori dell'azienda
        const companyUsers = await getUsers(ticketData.companyId);
        const admins = companyUsers.filter(u => u.role === 'Admin' || u.role === 'Creator');
        for (const admin of admins) {
            await addNotification({
                userId: admin.id,
                companyId: ticketData.companyId,
                message: `Nuovo ticket da ${ticketData.clientName}: "${ticketData.subject}"`,
                type: 'support_ticket',
                relatedInterventionId: createdTicket.id,
            }).catch(e => console.error("Error adding ticket notification for admin:", e));
        }
    } catch (notifErr) {
        console.error("Failed to send support ticket notifications:", notifErr);
    }

    return createdTicket;
}

export async function addSupportMessage(ticketId: string, sender: User, messageText: string, attachments?: Attachment[]): Promise<SupportTicket | null> {
    const ticket = await getSupportTicketById(ticketId);
    if (!ticket) return null;

    const newMessage: SupportMessage = {
        id: uuidv4(),
        senderId: sender.id,
        senderName: sender.name,
        text: messageText,
        createdAt: new Date().toISOString(),
        attachments: attachments || [],
    };

    const updatedMessages = [...ticket.messages, newMessage];
    const updatedAt = new Date().toISOString();

    // Se risponde l'assistenza / operatore / admin e il ticket non è chiuso, passa automaticamente in lavorazione
    const isStaff = sender.role === 'Admin' || sender.role === 'Operator' || sender.role === 'Creator' || sender.role === 'Distributor' || sender.role === 'DistributorAdmin';
    const newStatus = (isStaff && ticket.status !== 'Chiuso') ? 'In Lavorazione' : ticket.status;

    const { data, error } = await supabase.from('support_tickets')
        .update({ 
            messages: updatedMessages, 
            updated_at: updatedAt,
            status: newStatus 
        })
        .eq('id', ticketId)
        .select()
        .single();

    if (error || !data) return null;
    const updatedTicket = mapKeysToCamel<SupportTicket>(data);

    try {
        await sendSupportTicketEmailNotification(ticket.companyId, updatedTicket, false, sender);

        // Notifica in-app per nuovo messaggio
        if (sender.role === 'Client') {
            // Notifica gli amministratori se ha risposto il cliente
            const companyUsers = await getUsers(ticket.companyId);
            const admins = companyUsers.filter(u => u.role === 'Admin' || u.role === 'Creator');
            for (const admin of admins) {
                await addNotification({
                    userId: admin.id,
                    companyId: ticket.companyId,
                    message: `Nuovo messaggio da ${sender.name} sul ticket: "${ticket.subject}"`,
                    type: 'support_ticket',
                    relatedInterventionId: ticket.id,
                }).catch(e => console.error("Error adding message notification for admin:", e));
            }
        } else {
            // Notifica il cliente se ha risposto un operatore o amministratore
            if (ticket.clientId && ticket.clientId !== sender.id) {
                await addNotification({
                    userId: ticket.clientId,
                    companyId: ticket.companyId,
                    message: `Nuova risposta da ${sender.name} sul ticket: "${ticket.subject}"`,
                    type: 'support_ticket',
                    relatedInterventionId: ticket.id,
                }).catch(e => console.error("Error adding message notification for client:", e));
            }
        }
    } catch (emailErr) {
        console.error("Failed to send support ticket response notifications:", emailErr);
    }

    return updatedTicket;
}

export async function updateSupportTicketStatus(ticketId: string, status: SupportTicketStatus, updater?: User): Promise<void> {
    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase.from('support_tickets')
        .update({ status, updated_at: updatedAt })
        .eq('id', ticketId)
        .select()
        .single();

    if (!error && data && updater) {
        const ticket = mapKeysToCamel<SupportTicket>(data);
        await sendSupportTicketEmailNotification(ticket.companyId, ticket, false, updater);
    }
}

export async function deleteSupportTicket(ticketId: string): Promise<boolean> {
    try {
        await supabase.from('notifications').delete().eq('related_intervention_id', ticketId);
        const { error } = await supabase.from('support_tickets').delete().eq('id', ticketId);
        if (error) return false;
        return true;
    } catch (error) {
        console.error("Error deleting support ticket:", error);
        return false;
    }
}

// --- DISTRIBUTOR QUOTES ---

export async function getQuotesForCompany(companyId: string): Promise<DistributorQuote[]> {
    if (!companyId) return [];
    try {
        const { data, error } = await supabase.from('distributor_quotes').select('*').eq('company_id', companyId);
        if (error || !data) return [];
        const results = data.map(item => mapKeysToCamel<DistributorQuote>(item));
        return results.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    } catch (error) {
        console.error('Error fetching quotes for company:', error);
        return [];
    }
}

export async function getQuotesForDistributor(distributorId: string): Promise<DistributorQuote[]> {
    if (!distributorId) return [];
    try {
        const { data, error } = await supabase.from('distributor_quotes').select('*').eq('distributor_id', distributorId);
        if (error || !data) return [];
        const results = data.map(item => mapKeysToCamel<DistributorQuote>(item));
        return results.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    } catch (error) {
        console.error('Error fetching quotes for distributor:', error);
        return [];
    }
}

export async function addDistributorQuote(
    data: {
        distributorId: string;
        distributorName: string;
        companyId: string;
        fileName: string;
        fileDataUri: string;
        riferimento?: string;
        scadenza?: string;
        description?: string;
    }
): Promise<DistributorQuote> {
    const newId = generateShortId();
    const now = new Date().toISOString();
    const uploadResult = await uploadFileToSupabase(data.fileDataUri, data.fileName, 'quotes');
    if (uploadResult.error) {
        throw new Error(uploadResult.error || 'Errore durante il caricamento del file su Supabase Storage.');
    }
    const gcsObjectPath = uploadResult.url;

    let textContent: string | undefined;
    try {
        const pdfParseMod = await import('pdf-parse');
        const pdfParse = typeof pdfParseMod === 'function' ? pdfParseMod : ((pdfParseMod as any).default || pdfParseMod);
        const base64Data = data.fileDataUri.split(',')[1];
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        const parsed = await pdfParse(pdfBuffer);
        textContent = parsed.text?.slice(0, 10000) || undefined;
    } catch (pdfErr) {
        console.warn('[addDistributorQuote] PDF text extraction failed (non-blocking):', pdfErr);
    }

    const newQuote: DistributorQuote = {
        id: newId,
        distributorId: data.distributorId,
        distributorName: data.distributorName,
        companyId: data.companyId,
        fileName: data.fileName,
        gcsPath: gcsObjectPath,
        ...(data.riferimento ? { riferimento: data.riferimento } : {}),
        ...(data.scadenza ? { scadenza: data.scadenza } : {}),
        ...(data.description ? { description: data.description } : {}),
        ...(textContent ? { textContent } : {}),
        uploadedAt: now,
    };

    const snakeData = mapKeysToSnake(newQuote);
    const { error } = await supabase.from('distributor_quotes').insert(snakeData);
    if (error) throw new Error(error.message);

    return newQuote;
}

export async function deleteDistributorQuote(quoteId: string): Promise<boolean> {
    try {
        const { error } = await supabase.from('distributor_quotes').delete().eq('id', quoteId);
        if (error) return false;
        return true;
    } catch (error) {
        console.error('Error deleting quote:', error);
        return false;
    }
}

export async function updateDistributorQuote(
    quoteId: string,
    data: { riferimento?: string; scadenza?: string; description?: string }
): Promise<boolean> {
    try {
        const snakeData = mapKeysToSnake(data);
        const { error } = await supabase.from('distributor_quotes').update(snakeData).eq('id', quoteId);
        if (error) return false;
        return true;
    } catch (error) {
        console.error('Error updating quote:', error);
        return false;
    }
}

// --- DISTRIBUTOR OPERATORS ---

export async function getOperatorsByDistributorId(distributorId: string): Promise<User[]> {
    if (!distributorId) return [];
    try {
        const { data, error } = await supabase.from('users').select('*').eq('distributor_id', distributorId);
        if (error || !data) return [];
        return data.map(u => mapKeysToCamel<User>(u));
    } catch (error) {
        console.error('Error fetching operators:', error);
        return [];
    }
}

export interface OperatorStat {
    operatorId: string;
    operatorName: string;
    operatorEmail: string;
    role: UserRole;
    ticketsHandled: number;
    quotesUploaded: number;
    avgResponseMinutes: number | null;
}

export async function getOperatorStats(distributorId: string): Promise<OperatorStat[]> {
    const operators = await getOperatorsByDistributorId(distributorId);
    if (operators.length === 0) return [];

    const quotes = await getQuotesForDistributor(distributorId);
    const companies = await getCompaniesByDistributorId(distributorId);
    const companyIds = companies.map(c => c.id);

    let allTickets: SupportTicket[] = [];
    if (companyIds.length > 0) {
        const { data } = await supabase.from('support_tickets').select('*').in('company_id', companyIds);
        if (data) {
            allTickets = data.map(t => mapKeysToCamel<SupportTicket>(t));
        }
    }

    return operators.map(op => {
        let ticketsHandled = 0;
        let totalResponseMinutes = 0;
        let responseCount = 0;

        for (const ticket of allTickets) {
            const messages: SupportMessage[] = ticket.messages || [];
            const opMessages = messages.filter((m: any) => m.senderId === op.id);
            if (opMessages.length > 0) {
                ticketsHandled++;
                const createdAt = new Date(ticket.createdAt).getTime();
                const sorted = [...opMessages].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                if (sorted[0]?.createdAt) {
                    const mins = (new Date(sorted[0].createdAt).getTime() - createdAt) / 60000;
                    if (mins >= 0) { totalResponseMinutes += mins; responseCount++; }
                }
            }
        }

        const quotesUploaded = quotes.filter(q => (q as any).operatorId === op.id).length;

        return {
            operatorId: op.id,
            operatorName: op.name,
            operatorEmail: op.email,
            role: op.role,
            ticketsHandled,
            quotesUploaded,
            avgResponseMinutes: responseCount > 0 ? Math.round(totalResponseMinutes / responseCount) : null,
        };
    });
}

export async function getClients(companyId?: string): Promise<User[]> {
    const users = await getUsers(companyId);
    return users.filter(u => u.role === 'Client');
}

export async function getSupportTicketsForDistributor(distributorId: string): Promise<SupportTicket[]> {
    const companies = await getCompaniesByDistributorId(distributorId);
    const companyIds = companies.map(c => c.id);
    if (companyIds.length === 0) return [];
    const { data, error } = await supabase.from('support_tickets').select('*').in('company_id', companyIds);
    if (error || !data) return [];
    return data.map(item => mapKeysToCamel<SupportTicket>(item));
}

export async function consumeAutologinToken(token: string): Promise<AutologinToken | null> {
    const foundToken = await getAutologinToken(token);
    if (!foundToken) return null;
    await deleteAutologinToken(foundToken.id!);
    if (new Date(foundToken.expiresAt) < new Date()) return null;
    return foundToken;
}

export async function markInterventionUpdateAsRead(interventionId: string, userId: string): Promise<void> {
    const intervention = await getInterventionById(interventionId);
    if (!intervention) return;
    const updates = (intervention.updates || []).map(u => ({
        ...u,
        readBy: u.readBy?.includes(userId) ? u.readBy : [...(u.readBy || []), userId]
    }));
    await updateIntervention(interventionId, { updates });
}

export const getAllInterventions = getInterventions;
export const getAllAppointments = getAppointments;
export const getAllNotifications = (userId: string = '') => getNotifications(userId);
export const getAllSupportTickets = getSupportTickets;
export const getScheduledMaintenance = getScheduledMaintenances;
export const getClient = getUserById;
export const getOperator = getUserById;
