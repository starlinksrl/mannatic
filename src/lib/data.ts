

import { User, Client, Intervention, ScheduledMaintenance, Notification, UserRole, InterventionPriority, InterventionStatus, Company, Survey, SurveyStatus, PasswordResetToken, AllowedSector } from './types';
import { subDays, addDays, addMonths, addWeeks, isWithinInterval, startOfToday, differenceInHours, isAfter } from 'date-fns';
import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, deleteDoc, writeBatch, documentId, setDoc, collectionGroup, Query, queryEqual } from 'firebase/firestore';
import { triggerExpiryNotification, triggerNewInterventionNotification } from '@/app/actions';
import { generateShortId } from './utils';
import { v4 as uuidv4 } from 'uuid';


// --- GENERIC DOCUMENT MANAGEMENT ---
export async function updateDocument(collectionName: string, docId: string, data: Partial<any>): Promise<void> {
    try {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error(`Error updating document in ${collectionName}:`, error);
        throw new Error(`Failed to update document in ${collectionName}.`);
    }
}


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

export async function getCompanyByUserId(userId: string): Promise<Company | null> {
    const user = await getUserById(userId);
    if (!user || user.role === 'Creator') return null;

    try {
        const docRef = doc(db, 'companies', user.companyId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Company : null;
    } catch (error) {
        console.error("Error fetching company by user ID:", error);
        return null;
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
        // We shouldn't be updating the password this way
        const { password, ...dataToSave } = updatedData;
        await updateDoc(docRef, dataToSave);
        const updatedDoc = await getDoc(docRef);
        return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as Company : null;
    } catch (error) {
        console.error("Error updating company:", error);
        return null;
    }
}

export async function deleteCompanyAndSubcollections(companyId: string): Promise<void> {
    const collectionsToDelete = ['users', 'interventions', 'notifications', 'surveys', 'passwordResetTokens'];
    const batch = writeBatch(db);

    for (const coll of collectionsToDelete) {
        const q = query(collection(db, coll), where("companyId", "==", companyId));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
    }

    // Finally, delete the company itself
    const companyRef = doc(db, 'companies', companyId);
    batch.delete(companyRef);

    await batch.commit();
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
    if (id === 'user-creator') {
        const creatorUser: User = { 
          id: 'user-creator', 
          name: 'Creator', 
          email: 'creator@mannatic.com', 
          role: 'Creator', 
          avatarUrl: 'https://i.pravatar.cc/150?u=creator', 
          password: 'creatorpassword',
          companyId: 'none'
        };
        return Promise.resolve(creatorUser);
    }
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
    const newId = generateShortId();
    const newUserPayload: Omit<User, 'id'> = {
      ...userData,
      email: userData.email.toLowerCase(),
      avatarUrl: `https://i.pravatar.cc/150?u=${newId}`,
      address: userData.address || '',
      phone: userData.phone || '',
      allowedSectors: userData.allowedSectors || (userData.role === 'Operator' ? ['interventions', 'surveys', 'maintenance'] : undefined),
    };
    await setDoc(doc(db, 'users', newId), newUserPayload);
    
    return { id: newId, ...newUserPayload };
  } catch (error) {
      console.error("Error adding user:", error);
      throw new Error("Failed to add user.");
  }
}


export async function updateUser(id: string, updatedData: Partial<User>): Promise<User | null> {
    try {
        const userDocRef = doc(db, 'users', id);
        
        const dataToUpdate: Partial<User> = {...updatedData};
        if(dataToUpdate.password === '' || dataToUpdate.password === undefined) {
            delete dataToUpdate.password;
        }

        if (dataToUpdate.email) {
            dataToUpdate.email = dataToUpdate.email.toLowerCase();
        }
        
        // Ensure allowedSectors is only set for operators
        if (dataToUpdate.role && dataToUpdate.role !== 'Operator') {
            dataToUpdate.allowedSectors = undefined;
        }
        
        await updateDoc(userDocRef, dataToUpdate as any);
        
        const updatedDoc = await getDoc(userDocRef);
        if (updatedDoc.exists()) {
            return { id: updatedDoc.id, ...updatedDoc.data() } as User;
        }
        return null;
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

// --- PASSWORD RESET ---
export async function createPasswordResetToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    const user = await getUserById(userId);
    if (!user) throw new Error("User not found");

    await addDoc(collection(db, 'passwordResetTokens'), {
        userId,
        token,
        expiresAt: expiresAt.toISOString(),
        companyId: user.companyId
    });

    return token;
}

export async function resetUserPassword(token: string, newPassword: string):Promise<{ success: boolean, message: string }> {
    const q = query(collection(db, "passwordResetTokens"), where("token", "==", token));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { success: false, message: "Token di reset non valido o scaduto." };
    }

    const tokenDoc = querySnapshot.docs[0];
    const tokenData = tokenDoc.data() as PasswordResetToken;
    
    if (new Date() > new Date(tokenData.expiresAt)) {
         await deleteDoc(tokenDoc.ref);
         return { success: false, message: "Token di reset scaduto." };
    }

    await updateUser(tokenData.userId, { password: newPassword });
    await deleteDoc(tokenDoc.ref);

    return { success: true, message: "Password aggiornata con successo." };
}


// --- CLIENT & EQUIPMENT MANAGEMENT ---

export async function getClients(companyId: string): Promise<Client[]> {
  if (!companyId) return [];
  try {
    const q = query(collection(db, 'users'), where("companyId", "==", companyId), where("role", "==", "Client"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            companyId: data.companyId,
            address: data.address || '',
            phone: data.phone || ''
        } as Client
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

export async function getClient(clientId: string): Promise<Client | null> {
    const user = await getUserById(clientId);
    if (user && user.role === 'Client') {
        return { 
            id: user.id, 
            name: user.name, 
            companyId: user.companyId,
            address: user.address,
            phone: user.phone
        };
    }
    return null;
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

         const hasRecentNotification = allNotifications.some(n => 
            n.relatedInterventionId === intervention.id && 
            n.type === 'expiry' &&
            differenceInHours(now, new Date(n.createdAt)) < 24
        );

        if (isAfter(dueDate, now) && isAfter(expiryThreshold, dueDate) && !hasRecentNotification) {
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



export async function getInterventions(companyId: string): Promise<(Intervention | ScheduledMaintenance)[]> {
    if (!companyId) return [];
    
    // Check for expiring interventions (could be moved to a cron job in a real app)
    await checkAndNotifyExpiringInterventions(companyId);

    const q = query(collection(db, 'interventions'), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    const allCompanyInterventions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Intervention | ScheduledMaintenance)));
    
    // Filter in code instead of in the query
    //return allCompanyInterventions.filter(i => !('isMaintenance' in i) || i.isMaintenance !== true) as Intervention[];
    return allCompanyInterventions;
}

export async function getAllInterventions(): Promise<(Intervention | ScheduledMaintenance)[]> {
    try {
        const snapshot = await getDocs(collection(db, 'interventions'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Intervention | ScheduledMaintenance)));
    } catch (error) {
        console.error("Error fetching all interventions:", error);
        return [];
    }
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

    const q = query(collection(db, 'interventions'), where("companyId", "==", companyId), where("isMaintenance", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledMaintenance));
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
            
            const notificationInput = {
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
            };
            
            triggerNewInterventionNotification(notificationInput);

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
    
    // Check if clientId is an existing user ID or a new name string
    const existingUser = await getUserById(clientId);
    let finalClientId = existingUser ? existingUser.id : null;
    
    let clientName: string;

    if (!finalClientId) {
        clientName = clientId; // This is the new client's name from the input
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
            address: 'Indirizzo da definire',
            phone: 'Telefono da definire',
        });
        finalClientId = newClient.id;
    } else {
        clientName = existingUser!.name;
    }

    const dataForDb: any = { ...restOfData };
    if (dataForDb.dueTime === undefined) {
      delete dataForDb.dueTime;
    }
    
    const newId = generateShortId();
    const newInterventionData: Intervention = {
        ...dataForDb,
        id: newId,
        clientId: finalClientId,
        companyId: companyId,
        status: 'Nuovo' as InterventionStatus,
        sla: '24h',
        createdAt: new Date().toISOString(),
        updates: [{ date: new Date().toISOString(), description: `Creato da ${creatorName}.`, userName: creatorName }],
        dueDate: restOfData.dueDate || null,
        isMaintenance: false,
    };

    await setDoc(doc(db, 'interventions', newId), newInterventionData);

    // Trigger admin notification
    await notifyAdminOnNewIntervention(newInterventionData, clientName, creatorName);
    
    return newInterventionData;
}


export async function addScheduledMaintenance(maintenanceData: Omit<ScheduledMaintenance, 'id' | 'status' | 'sla' | 'createdAt' | 'isMaintenance' | 'nextDueDate' | 'updates'>): Promise<ScheduledMaintenance> {
    const nextDueDate = new Date().toISOString();
    
    const newId = generateShortId();
    const newMaintenanceData: ScheduledMaintenance = {
        ...maintenanceData,
        id: newId,
        status: 'Pianificato' as ScheduledMaintenanceStatus,
        sla: '48h',
        createdAt: new Date().toISOString(),
        isMaintenance: true,
        nextDueDate,
        updates: [{ date: new Date().toISOString(), description: 'Manutenzione programmata creata.', userName: 'Sistema' }],
        dueDate: maintenanceData.dueDate || null,
    };

    await setDoc(doc(db, 'interventions', newId), newMaintenanceData);
    return newMaintenanceData;
}

export async function createUpdateNotification(intervention: Intervention, updater: User) {
    const recipients: string[] = [];

    // Notify the client
    if (intervention.clientId && intervention.clientId !== updater.id) {
        recipients.push(intervention.clientId);
    }

    // Notify the assigned operator
    if (intervention.assignedOperatorId && intervention.assignedOperatorId !== updater.id) {
        recipients.push(intervention.assignedOperatorId);
    }
    
    // If client or operator is updating, notify admins
    if (updater.role === 'Client' || updater.role === 'Operator') {
        const qAdmins = query(collection(db, 'users'), where("companyId", "==", intervention.companyId), where("role", "==", "Admin"));
        const adminsSnapshot = await getDocs(qAdmins);
        adminsSnapshot.docs.forEach(doc => {
            if (doc.id !== updater.id) {
                 recipients.push(doc.id);
            }
        });
    }

    const uniqueRecipients = [...new Set(recipients)];

    for (const userId of uniqueRecipients) {
        const message = `${updater.name} ha aggiornato l'intervento #${intervention.id}: "${intervention.title}"`;
        addDoc(collection(db, 'notifications'), {
            userId: userId,
            companyId: intervention.companyId,
            message: message,
            read: false,
            createdAt: new Date().toISOString(),
            relatedInterventionId: intervention.id,
            type: 'status_change'
        });
    }
}


export async function updateIntervention(id: string, updatedData: Partial<Intervention>, updater: User): Promise<Intervention | null> {
    try {
        const docRef = doc(db, 'interventions', id);
        
        // Get original to compare updates
        const originalDoc = await getDoc(docRef);
        if (!originalDoc.exists()) return null;
        const originalIntervention = originalDoc.data() as Intervention;
        
        const dataToUpdate = { ...updatedData };
        if (dataToUpdate.dueDate === undefined) {
          dataToUpdate.dueDate = null;
        }
        if (dataToUpdate.completedAt === undefined) {
            delete (dataToUpdate as any).completedAt;
        } else if (dataToUpdate.completedAt === null) {
            dataToUpdate.completedAt = null;
        }
        
        const newUpdates = (dataToUpdate.updates || []).filter(u => 
            !(originalIntervention.updates || []).some(ou => ou.date === u.date && ou.userName === u.userName)
        );

        if (newUpdates.length > 0) {
            await createUpdateNotification({ id, ...dataToUpdate } as Intervention, updater);
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
        if (!originalDoc.exists()) {
            throw new Error(`Maintenance task with id ${id} not found.`);
        }
        const originalMaintenance = originalDoc.data() as ScheduledMaintenance;
        
        const combinedData: Partial<ScheduledMaintenance> = { ...originalMaintenance, ...updatedData };

        if (combinedData.dueDate === undefined) {
          combinedData.dueDate = null;
        }

        const isBeingCompleted = updatedData.status === 'Completato' && originalMaintenance.status !== 'Completato';

        if (isBeingCompleted) {
            // Recalculate next due date from now
            combinedData.nextDueDate = addMonths(new Date(), combinedData.recurrenceMonths!).toISOString();
            // Reset status to 'Pianificato' for the next cycle
            combinedData.status = 'Pianificato';
        } else if (updatedData.recurrenceMonths || updatedData.dueDate) {
            // Recalculate if recurrence or due date is manually changed for other reasons
            combinedData.nextDueDate = addMonths(new Date(combinedData.dueDate!), combinedData.recurrenceMonths!).toISOString();
        }

        await updateDoc(docRef, combinedData as any);
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

// --- SURVEYS MANAGEMENT (Firestore Implementation) ---

export async function getSurveys(companyId: string): Promise<Survey[]> {
    if (!companyId) return [];
    try {
        const q = query(collection(db, 'surveys'), where("companyId", "==", companyId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Survey));
    } catch (error) {
        console.error("Error fetching surveys:", error);
        return [];
    }
}

export async function getAllSurveys(): Promise<Survey[]> {
    try {
        const snapshot = await getDocs(collection(db, 'surveys'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Survey));
    } catch (error) {
        console.error("Error fetching all surveys:", error);
        return [];
    }
}

export async function addSurvey(surveyData: Omit<Survey, 'id' | 'status' | 'createdAt'>): Promise<Survey> {
    const { clientId, companyId, ...restOfData } = surveyData;

    const existingClient = await getUserById(clientId);
    let finalClientId = existingClient ? existingClient.id : null;

    if (!finalClientId) {
        console.log(`Client "${clientId}" not found by ID. Creating new client.`);
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (!companyDoc.exists()) throw new Error(`Company with id ${companyId} not found`);

        const company = companyDoc.data() as Company;
        const companyName = company.name?.toLowerCase().replace(/[^a-z0-9]/gi, '') || 'company';
        const clientNameNormalized = clientId.split(" ").join(".").toLowerCase();

        const newClient = await addUser({
            name: clientId,
            email: `${clientNameNormalized}@${companyName}.com`,
            password: 'password123',
            role: 'Client',
            companyId: companyId,
            address: surveyData.address,
            phone: null,
        });
        finalClientId = newClient.id;
    }

    const newId = generateShortId();
    const newSurvey: Survey = {
        ...restOfData,
        id: newId,
        clientId: finalClientId,
        companyId: companyId,
        status: 'Pianificato',
        createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'surveys', newId), newSurvey);
    return newSurvey;
}

export async function updateSurvey(id: string, updatedData: Partial<Survey>): Promise<Survey | null> {
    try {
        const docRef = doc(db, 'surveys', id);
        await updateDoc(docRef, updatedData);
        const updatedDoc = await getDoc(docRef);
        return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as Survey : null;
    } catch (error) {
        console.error("Error updating survey:", error);
        return null;
    }
}

export async function deleteSurvey(id: string): Promise<boolean> {
    try {
        await deleteDoc(doc(db, 'surveys', id));
        return true;
    } catch (error) {
        console.error("Error deleting survey:", error);
        return false;
    }
}


// --- NOTIFICATIONS ---

export async function getNotifications(companyId: string): Promise<Notification[]> {
    if (!companyId) return [];
    try {
        const q = query(collection(db, 'notifications'), where("companyId", "==", companyId));
        const snapshot = await getDocs(q);
        let notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        
        return notifications.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
}

export async function getAllNotifications(): Promise<Notification[]> {
    try {
        const snapshot = await getDocs(collection(db, 'notifications'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    } catch (error) {
        console.error("Error fetching all notifications:", error);
        return [];
    }
}


export async function markNotificationsAsRead(notificationIds: string[]): Promise<boolean> {
    if (notificationIds.length === 0) return true;
    try {
        const batch = writeBatch(db);
        notificationIds.forEach(id => {
            const docRef = doc(db, 'notifications', id);
            batch.update(docRef, { read: true });
        });
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error marking notifications as read:", error);
        return false;
    }
}
