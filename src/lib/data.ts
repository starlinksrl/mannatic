import { User, Client, Equipment, Intervention, ScheduledMaintenance, Notification, UserRole, InterventionPriority, InterventionStatus, Company, Survey, SurveyStatus } from './types';
import { subDays, addDays, addMonths, addWeeks, isWithinInterval, startOfToday, differenceInHours, isAfter } from 'date-fns';
import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, deleteDoc, writeBatch, documentId } from 'firebase/firestore';
import { triggerExpiryNotification, triggerNewInterventionNotification } from '@/app/actions';


// --- MOCK DATA (to be phased out or used for seeding) ---

let equipmentsMock: Equipment[] = [
  { id: 'equip-1', name: 'Impianto Clima A', clientId: 'client-1', companyId: 'company-1' },
  { id: 'equip-2', name: 'Server Room', clientId: 'client-1', companyId: 'company-1' },
  { id: 'equip-3', name: 'Linea Produzione B', clientId: 'client-2', companyId: 'company-1' },
  { id: 'equip-4', name: 'Ufficio A', clientId: 'client-3', companyId: 'company-2' },
];

let surveysMock: Survey[] = [
    {
        id: 'survey-1',
        title: 'Sopralluogo per nuovo impianto',
        clientId: 'client-1',
        address: 'Via Roma 1, Milano',
        date: addDays(new Date(), 2).toISOString(),
        assignedOperatorId: 'user-op-1',
        notes: 'Verificare quadro elettrico e predisposizione canali.',
        status: 'Pianificato',
        createdAt: new Date().toISOString(),
        companyId: 'company-1'
    },
    {
        id: 'survey-2',
        title: 'Verifica preliminare ufficio',
        clientId: 'client-2',
        address: 'Corso Buenos Aires 54, Milano',
        date: addDays(new Date(), 5).toISOString(),
        assignedOperatorId: 'user-op-2',
        status: 'Pianificato',
        createdAt: subDays(new Date(), 1).toISOString(),
        companyId: 'company-1'
    },
     {
        id: 'survey-3',
        title: 'Analisi fattibilità nuovo sistema',
        clientId: 'client-2',
        address: 'Piazza Duomo 1, Milano',
        date: subDays(new Date(), 10).toISOString(),
        assignedOperatorId: 'user-op-1',
        notes: 'Cliente ha firmato il verbale. In attesa di preventivo.',
        status: 'Eseguito',
        createdAt: subDays(new Date(), 15).toISOString(),
        companyId: 'company-1'
    },
];

// --- COMPANY MANAGEMENT ---

export async function getCompanies(): Promise<Company[]> {
    try {
        const q = query(collection(db, 'companies'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
    } catch (error) {
        console.error("Error fetching companies:", error);
        return [];
    }
}

export async function addCompany(companyData: Omit<Company, 'id'>): Promise<Company> {
    try {
        const companyPayload: Omit<Company, 'id' | 'password'> = {
            name: companyData.name,
            address: companyData.address || '',
            vatNumber: companyData.vatNumber || '',
            taxCode: companyData.taxCode || '',
            phone: companyData.phone || '',
            uniqueCode: companyData.uniqueCode || '',
            email: companyData.email || '',
        };

        const docRef = await addDoc(collection(db, 'companies'), companyPayload);
        
        // Create an admin user for the new company
        await addUser({
            name: `Admin ${companyData.name}`,
            email: companyData.email!,
            password: companyData.password!,
            role: 'Admin',
            companyId: docRef.id
        });
        
        return { id: docRef.id, ...companyPayload };

    } catch (error) {
        console.error("Error adding company:", error);
        throw new Error("Failed to add company.");
    }
}

export async function updateCompany(id: string, updatedData: Partial<Company>): Promise<Company | null> {
    try {
        const docRef = doc(db, 'companies', id);
        await updateDoc(docRef, updatedData);
        const updatedDoc = await getDoc(docRef);
        return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as Company : null;
    } catch (error) {
        console.error("Error updating company:", error);
        return null;
    }
}


// --- USER MANAGEMENT ---

export async function getUsers(companyId: string): Promise<User[]> {
  if(!companyId) return [];
  try {
    const q = query(collection(db, 'users'), where("companyId", "==", companyId));
    const userSnapshot = await getDocs(q);
    const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    return userList;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function getAllUsers(): Promise<User[]> {
   try {
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);
    const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    return userList;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
    if (!id) return null;
    try {
        const userDocRef = doc(db, 'users', id);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            return { id: userDoc.id, ...userDoc.data() } as User;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        return null;
    }
}

export async function addUser(userData: Omit<User, 'id' | 'avatarUrl'>): Promise<User> {
  try {
    const newUserPayload: Omit<User, 'id'> = {
      ...userData,
      email: userData.email.toLowerCase(),
      avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}`,
    };
    const docRef = await addDoc(collection(db, 'users'), newUserPayload);
    
    return { id: docRef.id, ...newUserPayload };
  } catch (error) {
      console.error("Error adding user:", error);
      throw new Error("Failed to add user.");
  }
}


export async function updateUser(id: string, updatedData: Partial<User>): Promise<User | null> {
    try {
        const userDocRef = doc(db, 'users', id);
        
        const dataToUpdate = {...updatedData};
        if(dataToUpdate.password === '' || dataToUpdate.password === undefined) {
            delete dataToUpdate.password;
        }

        if (dataToUpdate.email) {
            dataToUpdate.email = dataToUpdate.email.toLowerCase();
        }
        
        await updateDoc(userDocRef, dataToUpdate);
        
        return await getUserById(id);
    } catch (error) {
        console.error("Error updating user:", error);
        return null;
    }
}

export async function deleteUser(id: string): Promise<boolean> {
    try {
        await deleteDoc(doc(db, 'users', id));
        return true;
    } catch (error) {
        console.error("Error deleting user:", error);
        return false;
    }
}


// --- CLIENT & EQUIPMENT MANAGEMENT ---

export async function getClients(companyId: string): Promise<Client[]> {
  if (!companyId) return [];
  try {
    const q = query(collection(db, 'users'), where("companyId", "==", companyId), where("role", "==", "Client"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      companyId: doc.data().companyId,
    } as Client));
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

export async function getClient(clientId: string): Promise<Client | null> {
    const user = await getUserById(clientId);
    if (user && user.role === 'Client') {
        return { id: user.id, name: user.name, companyId: user.companyId };
    }
    return null;
}


export function getEquipments(companyId: string): Equipment[] {
    if (!companyId) return [];
    return equipmentsMock.filter(e => e.companyId === companyId);
}


export function getEquipment(equipmentId: string) {
  return equipmentsMock.find(e => e.id === equipmentId);
}

export async function getOperator(operatorId: string) {
    try {
        const user = await getUserById(operatorId);
        return user && user.role === 'Operator' ? user : null;
    } catch (error) {
        console.error("Error fetching operator:", error);
        return null;
    }
}

// --- INTERVENTION & MAINTENANCE MANAGEMENT ---

const CONVERSION_WINDOW_DAYS = 7;

async function checkAndConvertMaintenance(companyId: string) {
    if (!companyId) return;
    const today = startOfToday();
    const conversionInterval = {
        start: today,
        end: addDays(today, CONVERSION_WINDOW_DAYS),
    };

    const qMaint = query(collection(db, 'interventions'), 
      where("companyId", "==", companyId),
      where("isMaintenance", "==", true),
      where("status", "==", "Pianificato")
    );

    const maintSnapshot = await getDocs(qMaint);
    const maintenancesToConvert = maintSnapshot.docs.map(d => ({id: d.id, ...d.data()} as ScheduledMaintenance));

    for (const maint of maintenancesToConvert) {
        const nextDueDate = new Date(maint.nextDueDate);
        
        // Check if an intervention for this due date was already created recently
         const qExisting = query(collection(db, 'interventions'), 
            where("companyId", "==", companyId),
            where("title", "==", maint.title),
            where("isMaintenance", "!=", true), // ensure it's a converted one
            where("createdAt", ">", subDays(today, 2).toISOString())
         );
         const existingSnapshot = await getDocs(qExisting);
         const alreadyConverted = !existingSnapshot.empty;


        if (isWithinInterval(nextDueDate, conversionInterval) && !alreadyConverted) {
            console.log(`Converting maintenance ${maint.id} to intervention.`);
            
            const newInterventionData: Omit<Intervention, 'id'> = {
                title: maint.title,
                clientId: maint.clientId,
                description: `Creato automaticamente dalla manutenzione programmata: ${maint.description}`,
                priority: 'Bassa',
                sla: '48h',
                status: 'Nuovo',
                assignedOperatorId: maint.assignedOperatorId,
                createdAt: new Date().toISOString(),
                dueDate: maint.nextDueDate,
                updates: [{date: new Date().toISOString(), description: `Creato da manutenzione #${maint.id}`, userName: 'Sistema'}],
                companyId: maint.companyId
            };
            await addDoc(collection(db, 'interventions'), newInterventionData);

            // Update original maintenance task
            const maintDocRef = doc(db, 'interventions', maint.id);
            await updateDoc(maintDocRef, {
                status: 'In corso',
                nextDueDate: addMonths(new Date(maint.nextDueDate), maint.recurrenceMonths).toISOString()
            });
        }
    }
}

async function checkAndNotifyExpiringInterventions(companyId: string) {
    if (!companyId) return;
    
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    if (!companyDoc.exists()) return;
    const company = companyDoc.data() as Company;

    if (!company.smtpHost || !company.smtpPort || !company.smtpUser || !company.smtpPass || !company.senderEmail) {
        console.log(`Skipping expiry notifications for company ${companyId}: SMTP not configured.`);
        return;
    }

    const now = new Date();
    const expiryThreshold = addDays(now, 1);

    const qInterventions = query(collection(db, 'interventions'),
        where("companyId", "==", companyId),
        where("status", "in", ["Nuovo", "In corso", "In attesa"])
    );
    const interventionsSnapshot = await getDocs(qInterventions);
    const openInterventions = interventionsSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Intervention))
        .filter(i => i.dueDate && !i.isMaintenance);

    const allNotificationsSnapshot = await getDocs(query(collection(db, 'notifications'), where("companyId", "==", companyId)));
    const allNotifications = allNotificationsSnapshot.docs.map(doc => doc.data());

    for (const intervention of openInterventions) {
        if (!intervention.dueDate) continue;
        const dueDate = new Date(intervention.dueDate);

        if (isAfter(dueDate, now) && isAfter(expiryThreshold, dueDate)) {
            const hasRecentNotification = allNotifications.some(n => 
                n.relatedInterventionId === intervention.id && n.type === 'expiry'
            );

            if (!hasRecentNotification) {
                if (intervention.assignedOperatorId) {
                    const operator = await getOperator(intervention.assignedOperatorId);
                    const client = await getClient(intervention.clientId);

                    if (operator && operator.email && client) {
                        console.log(`Sending expiry notification for intervention #${intervention.id} to ${operator.email}`);
                        
                        triggerExpiryNotification({
                            recipientEmail: operator.email,
                            interventionId: intervention.id,
                            interventionTitle: intervention.title,
                            clientName: client.name,
                            dueDate: dueDate.toLocaleDateString('it-IT'),
                            smtpConfig: {
                                host: company.smtpHost,
                                port: company.smtpPort,
                                user: company.smtpUser,
                                pass: company.smtpPass,
                                from: company.senderEmail,
                            }
                        });

                        addDoc(collection(db, 'notifications'), {
                            userId: operator.id,
                            companyId: companyId,
                            message: `L'intervento #${intervention.id} (${intervention.title}) scade a breve.`,
                            read: false,
                            createdAt: new Date().toISOString(),
                            relatedInterventionId: intervention.id,
                            type: 'expiry'
                        });
                    }
                }
            }
        }
    }
}



export async function getInterventions(companyId: string): Promise<Intervention[]> {
    if (!companyId) return [];
    await checkAndConvertMaintenance(companyId);
    await checkAndNotifyExpiringInterventions(companyId);
    
    const q = query(collection(db, 'interventions'), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    const allCompanyInterventions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Intervention | ScheduledMaintenance)));
    
    // Filter in code instead of in the query
    return allCompanyInterventions.filter(i => !('isMaintenance' in i) || i.isMaintenance !== true) as Intervention[];
}

export async function getInterventionTitles(companyId: string): Promise<string[]> {
    if (!companyId) return [];
    
    const q = query(collection(db, 'interventions'), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    const titles = snapshot.docs.map(doc => doc.data().title as string);
    
    // Return unique titles
    return [...new Set(titles)];
}

export async function getScheduledMaintenance(companyId: string): Promise<ScheduledMaintenance[]> {
    if (!companyId) return [];
    await checkAndConvertMaintenance(companyId);
    await checkAndNotifyExpiringInterventions(companyId);

    const q = query(collection(db, 'interventions'), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    const allCompanyInterventions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Intervention | ScheduledMaintenance)));

    // Filter in code instead of in the query
    return allCompanyInterventions.filter(i => 'isMaintenance' in i && i.isMaintenance === true) as ScheduledMaintenance[];
}

type AddInterventionParams = Omit<Intervention, 'id' | 'status' | 'sla' | 'createdAt' | 'updates'> & { creatorName: string };

async function notifyAdminOnNewIntervention(intervention: Intervention, clientName: string, creatorName: string) {
    const { companyId, id, title, description, priority, dueDate, assignedOperatorId } = intervention;

    // 1. Get Company and check SMTP settings
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    if (!companyDoc.exists()) return;
    const company = companyDoc.data() as Company;

    if (!company.smtpHost || !company.smtpPort || !company.smtpUser || !company.smtpPass || !company.senderEmail) {
        console.log(`Skipping new intervention notification for company ${companyId}: SMTP not configured.`);
        return;
    }

    // 2. Find Admins
    const qAdmins = query(collection(db, 'users'), where("companyId", "==", companyId), where("role", "==", "Admin"));
    const adminsSnapshot = await getDocs(qAdmins);
    const admins = adminsSnapshot.docs.map(d => ({id: d.id, ...d.data()} as User));

    if (admins.length === 0) return;

    // 3. Get operator name if exists
    let operatorName: string | undefined;
    if (assignedOperatorId) {
        const operator = await getOperator(assignedOperatorId);
        if (operator) {
            operatorName = operator.name;
        }
    }


    // 4. Trigger notification for each admin
    for (const admin of admins) {
        if (admin.email) {
            console.log(`Sending new intervention notification for #${id} to admin ${admin.email}`);
            triggerNewInterventionNotification({
                recipientEmail: admin.email,
                interventionId: id,
                interventionTitle: title,
                interventionDescription: description,
                interventionPriority: priority,
                interventionDueDate: dueDate,
                clientName: clientName,
                creatorName: creatorName,
                assignedOperatorName: operatorName,
                smtpConfig: {
                    host: company.smtpHost,
                    port: company.smtpPort,
                    user: company.smtpUser,
                    pass: company.smtpPass,
                    from: company.senderEmail,
                }
            });

             // Create in-app notification for admin
            const notificationMessage = `Nuovo intervento #${id} (${title}) creato da ${creatorName} per il cliente ${clientName}.`;
            addDoc(collection(db, 'notifications'), {
                userId: admin.id,
                companyId: companyId,
                message: notificationMessage,
                read: false,
                createdAt: new Date().toISOString(),
                relatedInterventionId: id,
                type: 'assignment'
            });
        }
    }
}


export async function addIntervention(interventionData: AddInterventionParams): Promise<Intervention> {
    const { creatorName, clientId, companyId, ...restOfData } = interventionData;
    
    // Check if clientId is an existing user or a new name
    const clients = await getClients(companyId);
    let finalClientId = clients.find(c => c.name.toLowerCase() === clientId.toLowerCase())?.id;
    let clientName = clientId;
    let newClientWasCreated = false;

    if (!finalClientId) {
        console.log(`Client "${clientId}" not found. Creating new client.`);
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (!companyDoc.exists()) {
            throw new Error(`Company with id ${companyId} not found`);
        }
        const company = companyDoc.data() as Company;
        const companyName = company.name?.toLowerCase().replace(/[^a-z0-9]/gi, '') || 'company';
        const clientNameNormalized = clientId.split(" ").join(".").toLowerCase();


        const newClient = await addUser({
            name: clientId,
            email: `${clientNameNormalized}@${companyName}.com`,
            password: 'password123',
            role: 'Client',
            companyId: companyId,
        });
        finalClientId = newClient.id;
        clientName = newClient.name;
        newClientWasCreated = true;
        console.log(`New client created with ID: ${finalClientId}`);
    } else {
        const client = await getClient(finalClientId);
        if (client) clientName = client.name;
    }

    const newInterventionData: Omit<Intervention, 'id'> = {
        ...restOfData,
        clientId: finalClientId,
        companyId: companyId,
        status: 'Nuovo' as InterventionStatus,
        sla: '24h',
        createdAt: new Date().toISOString(),
        updates: [{ date: new Date().toISOString(), description: `Creato da ${creatorName}.`, userName: creatorName }],
        dueDate: restOfData.dueDate || null,
    };

    if (newInterventionData.dueDate === undefined) {
        delete (newInterventionData as any).dueDate;
    }

    const docRef = await addDoc(collection(db, 'interventions'), newInterventionData);
    const finalIntervention = { id: docRef.id, ...newInterventionData };

    // Trigger admin notification
    await notifyAdminOnNewIntervention(finalIntervention, clientName, creatorName);
    
    return finalIntervention;
}


export async function addScheduledMaintenance(maintenanceData: Omit<ScheduledMaintenance, 'id' | 'status' | 'sla' | 'createdAt' | 'isMaintenance' | 'nextDueDate' | 'updates'>): Promise<ScheduledMaintenance> {
    const nextDueDate = addMonths(new Date(maintenanceData.dueDate!), maintenanceData.recurrenceMonths).toISOString();
    
    const newMaintenanceData = {
        ...maintenanceData,
        status: 'Pianificato' as InterventionStatus,
        sla: '48h',
        createdAt: new Date().toISOString(),
        isMaintenance: true,
        nextDueDate,
        updates: [{ date: new Date().toISOString(), description: 'Manutenzione programmata creata.', userName: 'Sistema' }],
        dueDate: maintenanceData.dueDate || null,
    };

    if (newMaintenanceData.dueDate === undefined) {
        delete (newMaintenanceData as any).dueDate;
    }

    const docRef = await addDoc(collection(db, 'interventions'), newMaintenanceData);
    return { id: docRef.id, ...newMaintenanceData };
}

export async function updateIntervention(id: string, updatedData: Partial<Intervention>): Promise<Intervention | null> {
    try {
        const docRef = doc(db, 'interventions', id);
        
        const dataToUpdate = { ...updatedData };
        if (dataToUpdate.completedAt === undefined) {
            delete (dataToUpdate as any).completedAt;
        }
        
        await updateDoc(docRef, dataToUpdate as any);
        const updatedDoc = await getDoc(docRef);
        return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as Intervention : null;
    } catch (error) {
        console.error("Error updating intervention:", error);
        return null;
    }
}

export async function updateScheduledMaintenance(id: string, updatedData: Partial<ScheduledMaintenance>): Promise<ScheduledMaintenance | null> {
     try {
        const docRef = doc(db, 'interventions', id);
        
        const originalDoc = await getDoc(docRef);
        const originalMaintenance = originalDoc.data() as ScheduledMaintenance;

        const combinedData = { ...originalMaintenance, ...updatedData };
         
        // Recalculate next due date if recurrence or due date changes
        if (updatedData.recurrenceMonths || updatedData.dueDate) {
            combinedData.nextDueDate = addMonths(new Date(combinedData.dueDate!), combinedData.recurrenceMonths).toISOString();
        }

        await updateDoc(docRef, combinedData);
        const updatedDoc = await getDoc(docRef);
        return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as ScheduledMaintenance : null;
    } catch (error) {
        console.error("Error updating maintenance:", error);
        return null;
    }
}

export async function deleteIntervention(id: string): Promise<boolean> {
    try {
        await deleteDoc(doc(db, 'interventions', id));
        return true;
    } catch (error) {
        console.error("Error deleting intervention:", error);
        return false;
    }
}

export async function deleteScheduledMaintenance(id: string): Promise<boolean> {
    try {
        await deleteDoc(doc(db, 'interventions', id));
        return true;
    } catch (error) {
        console.error("Error deleting maintenance:", error);
        return false;
    }
}

// --- SURVEYS MANAGEMENT (Mocked) ---

export async function getSurveys(companyId: string): Promise<Survey[]> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(surveysMock.filter(s => s.companyId === companyId));
        }, 500);
    });
}

export async function addSurvey(surveyData: Omit<Survey, 'id' | 'status' | 'createdAt'>): Promise<Survey> {
    return new Promise(resolve => {
        setTimeout(() => {
            const newSurvey: Survey = {
                id: `survey-${Date.now()}`,
                status: 'Pianificato',
                createdAt: new Date().toISOString(),
                ...surveyData,
            };
            surveysMock = [newSurvey, ...surveysMock];
            resolve(newSurvey);
        }, 300);
    });
}

export async function updateSurvey(id: string, updatedData: Partial<Survey>): Promise<Survey | null> {
    return new Promise(resolve => {
        setTimeout(() => {
            let surveyToUpdate = surveysMock.find(s => s.id === id);
            if (surveyToUpdate) {
                const updatedSurvey = { ...surveyToUpdate, ...updatedData };
                surveysMock = surveysMock.map(s => s.id === id ? updatedSurvey : s);
                resolve(updatedSurvey);
            } else {
                resolve(null);
            }
        }, 300);
    });
}

export async function deleteSurvey(id: string): Promise<boolean> {
    return new Promise(resolve => {
        setTimeout(() => {
            const initialLength = surveysMock.length;
            surveysMock = surveysMock.filter(s => s.id !== id);
            resolve(surveysMock.length < initialLength);
        }, 300);
    });
}


// --- NOTIFICATIONS ---

export async function getNotifications(companyId: string): Promise<Notification[]> {
    if (!companyId) return [];
    try {
        const q = query(collection(db, 'notifications'), where("companyId", "==", companyId));
        const snapshot = await getDocs(q);
        let notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        
        // If no notifications, create some demo ones.
        if (notifications.length === 0 && companyId === 'company-1') { 
            const allUsers = await getUsers(companyId);
            const admin = allUsers.find(u => u.role === 'Admin');
            const operator = allUsers.find(u => u.role === 'Operator');
            const client = allUsers.find(u => u.role === 'Client');
            
            const batch = writeBatch(db);
            
            if(admin?.id) {
              const adminNotifRef = doc(collection(db, 'notifications'));
              batch.set(adminNotifRef, { userId: admin.id, message: 'Rischio di SLA per intervento #1023', read: false, createdAt: subDays(new Date(), 1).toISOString(), companyId, type: 'alert', relatedInterventionId: 'int-1' });
            }
            if(operator?.id) {
              const opNotifRef = doc(collection(db, 'notifications'));
              batch.set(opNotifRef, { userId: operator.id, message: 'Nuovo intervento #1024 assegnato', read: false, createdAt: new Date().toISOString(), companyId, type: 'assignment', relatedInterventionId: 'int-2' });
            }
            if(client?.id) {
              const clientNotifRef = doc(collection(db, 'notifications'));
              batch.set(clientNotifRef, { userId: client.id, message: 'Intervento #1021 completato', read: true, createdAt: subDays(new Date(), 2).toISOString(), companyId, type: 'status_change', relatedInterventionId: 'int-3' });
            }

            await batch.commit();
            
            const newSnapshot = await getDocs(q);
            notifications = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        }

        return notifications.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
}
