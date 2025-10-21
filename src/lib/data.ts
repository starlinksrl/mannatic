

import { User, Client, Intervention, ScheduledMaintenance, Notification, UserRole, InterventionPriority, InterventionStatus, Company, Appointment, AppointmentStatus, PasswordResetToken, AllowedSector, InterventionUpdate, AppConfiguration, Attachment, InterventionType, WorkLog, AutologinToken, SupportTicket, SupportMessage, SupportTicketStatus } from './types';
import { subDays, addDays, addMonths, addWeeks, isWithinInterval, startOfToday, differenceInHours, isAfter, differenceInMinutes, addHours } from 'date-fns';
import { db, auth } from './firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, deleteDoc, writeBatch, documentId, setDoc, collectionGroup, Query, queryEqual, deleteField, orderBy } from 'firebase/firestore';
import { triggerExpiryNotification, triggerNewInterventionNotification, sendClientUpdateEmail, triggerSupportTicketNotification, sendPushNotification } from '@/app/actions';
import { generateShortId } from './utils';
import { v4 as uuidv4 } from 'uuid';
import { uploadFileToGcs } from '@/ai/flows/upload-file-to-gcs';
import { Resend } from 'resend';


// --- APP CONFIGURATION ---

export async function getAppConfiguration(): Promise<AppConfiguration | null> {
    try {
        const docRef = doc(db, 'appConfiguration', 'global');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: 'global', ...docSnap.data() } as AppConfiguration : null;
    } catch (error) {
        console.error("Error fetching app configuration:", error);
        return null;
    }
}

export async function updateAppConfiguration(config: Partial<Omit<AppConfiguration, 'id'>>): Promise<AppConfiguration | null> {
    try {
        const docRef = doc(db, 'appConfiguration', 'global');
        
        const configToSave: Partial<AppConfiguration> = { ...config };
        
        if (!config.gcsPrivateKey || config.gcsPrivateKey.trim() === '' || config.gcsPrivateKey === '••••••••') {
            delete configToSave.gcsPrivateKey;
        }

        if (!config.resendApiKey || config.resendApiKey.trim() === '' || config.resendApiKey === '••••••••') {
            delete configToSave.resendApiKey;
        }

        await setDoc(docRef, configToSave, { merge: true });
        
        const updatedDoc = await getDoc(docRef);
        return updatedDoc.exists() ? { id: 'global', ...updatedDoc.data() } as AppConfiguration : null;
    } catch (error) {
        console.error("Error updating app configuration:", error);
        return null;
    }
}


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

export async function getCompanies(creatorId?: string): Promise<Company[]> {
    try {
        let q = query(collection(db, 'companies'));
        // If creatorId is provided, filter by it.
        // If creatorId is undefined (which can happen for the main creator), this filter is skipped, and all companies are fetched.
        if (creatorId) {
            q = query(q, where("creatorId", "==", creatorId));
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
    } catch (error) {
        console.error("Error fetching companies:", error);
        return [];
    }
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
    try {
        const docRef = doc(db, 'companies', companyId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Company : null;
    } catch (error) {
        console.error("Error fetching company by ID:", error);
        return null;
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

export async function addCompany(companyData: Partial<Company> & { adminName: string, email: string, password?: string, creatorId?: string | null }): Promise<{ company: Company, adminUser: User }> {
    const existingUser = await getUserByEmail(companyData.email!);
    if (existingUser) {
        throw new Error('Un utente con questa email esiste già.');
    }

    try {
        const appConfig = await getAppConfiguration();
        
        const companyPayload: Omit<Company, 'id'> = {
            name: companyData.name!,
            creatorId: companyData.creatorId === undefined ? null : companyData.creatorId,
            address: companyData.address || '',
            vatNumber: companyData.vatNumber || '',
            taxCode: companyData.taxCode || '',
            phone: companyData.phone || '',
            uniqueCode: companyData.uniqueCode || '',
            email: companyData.email || '',
            platformUrl: companyData.platformUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://work.mannatec.it',
            resendApiKey: appConfig?.resendApiKey || null,
            senderEmail: appConfig?.defaultSenderEmail || null,
        };

        const docRef = await addDoc(collection(db, 'companies'), companyPayload);
        
        const adminUser = await addUser({
            name: companyData.adminName,
            email: companyData.email!,
            password: companyData.password!,
            role: 'Admin',
            companyId: docRef.id
        });
        
        return { company: { id: docRef.id, ...companyPayload }, adminUser };

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
        const docRef = doc(db, 'companies', id);
        
        const dataToSave = { ...updatedData };
        if (dataToSave.resendApiKey === '') {
            delete dataToSave.resendApiKey;
        }

        await updateDoc(docRef, dataToSave);
        const updatedDoc = await getDoc(docRef);
        return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as Company : null;
    } catch (error) {
        console.error("Error updating company:", error);
        return null;
    }
}

export async function deleteCompanyAndSubcollections(companyId: string): Promise<void> {
    const collectionsToDelete = ['users', 'interventions', 'notifications', 'appointments', 'passwordResetTokens'];
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

export async function getUsers(companyId?: string): Promise<User[]> {
  try {
    let q;
    if (companyId) {
        q = query(collection(db, 'users'), where("companyId", "==", companyId));
    } else {
        q = query(collection(db, 'users'));
    }
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

export async function addUser(userData: Partial<Omit<User, 'avatarUrl'>>): Promise<User> {
    if (!userData.email) {
        throw new Error("Email is required to add a user.");
    }

    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
        throw new Error('Un utente con questa email esiste già.');
    }
    
    // Prevent non-main creator from creating other creators
    if (userData.currentUser?.email !== 'creator@mannatic.com' && userData.role === 'Creator') {
        throw new Error("Non hai i permessi per creare un utente Creator.");
    }

    try {
        let userId = userData.id || generateShortId(20);
        const passwordForDb = userData.password || 'starlink74';
        
        const newUserPayload: Partial<User> = {
            id: userId,
            name: userData.name!,
            email: userData.email!.toLowerCase(),
            role: userData.role!,
            companyId: userData.companyId!,
            avatarUrl: `https://i.pravatar.cc/150?u=${userId}`,
            address: userData.address || '',
            phone: userData.phone || '',
            password: passwordForDb,
            latitude: userData.latitude ?? null,
            longitude: userData.longitude ?? null,
            clientNotes: userData.clientNotes || '',
        };
        
        if (newUserPayload.role === 'Operator') {
             newUserPayload.allowedSectors = userData.allowedSectors || ['interventions', 'surveys', 'maintenance'];
        } else {
            delete newUserPayload.allowedSectors;
        }
        
        await setDoc(doc(db, 'users', userId!), newUserPayload);
        
        return { ...newUserPayload, id: userId! } as User;
    } catch (error) {
        console.error("Error adding user to Firestore:", error);
        throw new Error("Si è verificato un errore imprevisto durante la creazione dell'utente.");
    }
}


export async function updateUser(id: string, updatedData: Partial<User>): Promise<User | null> {
    try {
        const userDocRef = doc(db, 'users', id);
        
        const dataToUpdate: { [key: string]: any } = {...updatedData};
        
        if (dataToUpdate.email) {
            const existingUser = await getUserByEmail(dataToUpdate.email);
            if(existingUser && existingUser.id !== id) {
                throw new Error("Un altro utente sta già utilizzando questa email.");
            }
            dataToUpdate.email = dataToUpdate.email.toLowerCase();
        }

        if (!dataToUpdate.password || dataToUpdate.password.trim() === '') {
            delete dataToUpdate.password;
        }
        
        // Clean up any undefined fields before sending to Firestore
        Object.keys(dataToUpdate).forEach(key => {
            if (dataToUpdate[key] === undefined) {
                delete dataToUpdate[key];
            }
        });

        if (dataToUpdate.role !== 'Operator') {
            dataToUpdate.allowedSectors = deleteField();
        }
        
        await updateDoc(userDocRef, dataToUpdate);
        
        const updatedDoc = await getDoc(userDocRef);
        if (updatedDoc.exists()) {
            return { id: updatedDoc.id, ...updatedDoc.data() } as User;
        }
        return null;
    } catch (error) {
        console.error("Error updating user:", error);
         if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to update user.");
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

// --- PASSWORD RESET & AUTOLOGIN ---
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

export async function createAutologinToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Token expires in 10 minutes

    const user = await getUserById(userId);
    if (!user) throw new Error("User not found for autologin token");

    await addDoc(collection(db, 'autologinTokens'), {
        userId,
        token,
        expiresAt: expiresAt.toISOString(),
        companyId: user.companyId
    });

    return token;
}

export async function consumeAutologinToken(token: string): Promise<User | null> {
    const q = query(collection(db, "autologinTokens"), where("token", "==", token));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null; // Token not found
    }

    const tokenDoc = querySnapshot.docs[0];
    const tokenData = tokenDoc.data() as AutologinToken;

    // Immediately delete the token to ensure it's single-use
    await deleteDoc(tokenDoc.ref);
    
    if (new Date() > new Date(tokenData.expiresAt)) {
        return null; // Token expired
    }

    const user = await getUserById(tokenData.userId);
    return user;
}


// --- CLIENT & EQUIPMENT MANAGEMENT ---

export async function getClients(companyId: string): Promise<User[]> {
  if (!companyId) return [];
  try {
    const q = query(collection(db, 'users'), where("companyId", "==", companyId), where("role", "==", "Client"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

export async function getClient(clientId: string): Promise<User | null> {
    const user = await getUserById(clientId);
    if (user && user.role === 'Client') {
        return user;
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
    const company = { id: companyDoc.id, ...companyDoc.data() } as Company;

    if (!company.resendApiKey || !company.senderEmail) {
        console.log(`Skipping expiry notifications for company ${companyId}: Resend not configured.`);
        return;
    }

    const now = new Date();
    const expiryThreshold = addDays(now, 1);

    const qInterventions = query(collection(db, 'interventions'),
        where("companyId", "==", companyId),
        where("status", "in", ["Nuovo", "In corso"])
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
                    
                    await triggerExpiryNotification({
                        recipientEmail: operator.email,
                        interventionId: intervention.id,
                        interventionTitle: intervention.title,
                        clientName: client.name,
                        dueDate: dueDate.toLocaleDateString('it-IT'),
                        companyId: company.id,
                        resendConfig: {
                            apiKey: company.resendApiKey,
                            from: company.senderEmail,
                        }
                    });

                    if (operator.pushSubscriptions && operator.pushSubscriptions.length > 0) {
                        const payload = JSON.stringify({
                            title: 'Intervento in Scadenza',
                            body: `L'intervento #${intervention.id}: "${intervention.title}" scade a breve.`,
                            data: { url: `/dashboard/interventions?id=${intervention.id}` },
                        });
                        operator.pushSubscriptions.forEach(sub => sendPushNotification(sub, payload));
                    }
                }
            }
        }
    }
}


export async function getInterventions(companyId: string): Promise<(Intervention | ScheduledMaintenance)[]> {
    if (!companyId) return [];
    
    await checkAndNotifyExpiringInterventions(companyId);

    const q = query(collection(db, 'interventions'), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    const allCompanyInterventions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Intervention | ScheduledMaintenance)));
    
    const now = new Date();
    const autoClosedInterventions: Intervention[] = [];
    
    for (const intervention of allCompanyInterventions) {
        if ('workLogs' in intervention && intervention.workLogs) {
            let needsUpdate = false;
            const updatedLogs = intervention.workLogs.map(log => {
                if (log.startTime && !log.endTime && differenceInHours(now, new Date(log.startTime)) > 12) {
                    needsUpdate = true;
                    return {
                        ...log,
                        endTime: addHours(new Date(log.startTime), 1).toISOString(),
                        endPosition: log.startPosition,
                    };
                }
                return log;
            });

            if (needsUpdate) {
                const updatedIntervention = { ...intervention, workLogs: updatedLogs };
                
                const totalMinutes = updatedLogs
                    .filter(log => log.endTime)
                    .reduce((acc, log) => acc + differenceInMinutes(new Date(log.endTime!), new Date(log.startTime)), 0);
                updatedIntervention.timeSpent = parseFloat((totalMinutes / 60).toFixed(2));
                
                const systemUpdate: InterventionUpdate = {
                    date: new Date().toISOString(),
                    description: "Sessione di lavoro terminata automaticamente dal sistema per superamento del tempo massimo.",
                    userName: "Sistema",
                };
                updatedIntervention.updates = [...(updatedIntervention.updates || []), systemUpdate];
                
                await updateDoc(doc(db, 'interventions', intervention.id), updatedIntervention);
                autoClosedInterventions.push(updatedIntervention as Intervention);
            }
        }
    }
    
    return allCompanyInterventions.map(i => {
        const updatedVersion = autoClosedInterventions.find(aci => aci.id === i.id);
        return updatedVersion || i;
    });
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
    
    return [...new Set(titles)];
}

export async function getScheduledMaintenance(companyId: string): Promise<ScheduledMaintenance[]> {
    if (!companyId) return [];

    const q = query(collection(db, 'interventions'), where("companyId", "==", companyId), where("isMaintenance", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledMaintenance));
}

type AddInterventionParams = Omit<Intervention, 'id' | 'status' | 'sla' | 'createdAt' | 'updates'> & { creatorName: string, notifyClient: boolean };

export async function addIntervention(interventionData: AddInterventionParams): Promise<Intervention> {
    const { creatorName, clientId, companyId, attachments, notifyClient, ...restOfData } = interventionData;
    
    const existingUser = await getUserById(clientId);
    let finalClientId = existingUser ? existingUser.id : null;
    
    let clientName: string;

    if (!finalClientId) {
        clientName = clientId; 
        
        const clientNameNormalized = clientId.split(" ").join(".").toLowerCase();
        
        const clientEmail = `${clientNameNormalized}@mannatec.it`;

        const newClient = await addUser({
            name: clientId,
            email: clientEmail, 
            role: 'Client',
            companyId: companyId,
            address: 'Indirizzo da definire',
            phone: 'Telefono da definire',
        });
        if (!newClient) {
             throw new Error(`Non è stato possibile creare il cliente. L'email ${clientEmail} potrebbe essere già in uso.`);
        }
        finalClientId = newClient.id;
    } else {
        clientName = existingUser!.name;
    }

    const dataForDb: any = { ...restOfData };
    if (dataForDb.dueDate === undefined) {
      dataForDb.dueDate = null;
    }
    
    const newId = generateShortId();
    
    const appConfig = await getAppConfiguration();
    const finalAttachments: Attachment[] = [];
    if (appConfig && appConfig.gcsBucketName && attachments) {
        for (const attachment of attachments) {
            try {
                const uploadResult = await uploadFileToGcs({
                    fileDataUri: attachment.url,
                    fileName: `${newId}/${attachment.id}-${attachment.name}`,
                    config: {
                        projectId: appConfig.gcsProjectId!,
                        clientEmail: appConfig.gcsClientEmail!,
                        privateKey: appConfig.gcsPrivateKey!,
                        bucketName: appConfig.gcsBucketName!,
                    }
                });

                if (uploadResult.success && uploadResult.fileUrl) {
                    finalAttachments.push({
                        ...attachment,
                        url: uploadResult.fileUrl,
                    });
                } else {
                   console.error(`Failed to upload attachment ${attachment.name}: ${uploadResult.error}`);
                   finalAttachments.push(attachment);
                }
            } catch(uploadError) {
                console.error(`Failed to upload attachment ${attachment.name}:`, uploadError);
                finalAttachments.push(attachment);
            }
        }
    }


    const newInterventionData: Intervention = {
        ...dataForDb,
        id: newId,
        clientId: finalClientId,
        companyId: companyId,
        status: 'Nuovo' as InterventionStatus,
        sla: '24h',
        createdAt: new Date().toISOString(),
        updates: [{ date: new Date().toISOString(), description: `Intervento creato.`, userName: creatorName }],
        dueDate: restOfData.dueDate || null,
        isMaintenance: false,
        type: restOfData.type || 'standard',
        attachments: finalAttachments,
    };

    await setDoc(doc(db, 'interventions', newId), newInterventionData);

    const companyDocRef = doc(db, 'companies', companyId);
    const companyDoc = await getDoc(companyDocRef);
    if (companyDoc.exists()) {
        const company: Company = { id: companyDoc.id, ...companyDoc.data() };

        if (company.resendApiKey && company.senderEmail) {
            const qAdmins = query(collection(db, 'users'), where("companyId", "==", companyId), where("role", "==", "Admin"));
            const adminsSnapshot = await getDocs(qAdmins);
            const admins = adminsSnapshot.docs.map(d => ({id: d.id, ...d.data()} as User));
            let operatorName: string | undefined;
            if (newInterventionData.assignedOperatorId) {
                const operator = await getOperator(newInterventionData.assignedOperatorId);
                if (operator) operatorName = operator.name;
            }
            
            for (const admin of admins) {
                if (admin.email) {
                    await triggerNewInterventionNotification({
                        recipientEmail: admin.email,
                        interventionId: newInterventionData.id,
                        interventionTitle: newInterventionData.title,
                        interventionDescription: newInterventionData.description,
                        interventionPriority: newInterventionData.priority,
                        interventionDueDate: newInterventionData.dueDate,
                        clientName: clientName,
                        creatorName: creatorName,
                        assignedOperatorName: operatorName,
                        companyId: company.id,
                        resendConfig: {
                            apiKey: company.resendApiKey,
                            from: company.senderEmail,
                        }
                    });
                }
                 await addDoc(collection(db, 'notifications'), {
                    userId: admin.id,
                    companyId: companyId,
                    message: `Nuovo intervento #${newInterventionData.id} (${newInterventionData.title}) creato da ${creatorName} per il cliente ${clientName}.`,
                    read: false, createdAt: new Date().toISOString(), relatedInterventionId: newId, type: 'assignment'
                });

                if (admin.pushSubscriptions && admin.pushSubscriptions.length > 0) {
                    const payload = JSON.stringify({
                        title: 'Nuovo Intervento Creato',
                        body: `Intervento #${newId}: ${newInterventionData.title}`,
                        data: { url: `/dashboard/interventions?id=${newId}` },
                    });
                    admin.pushSubscriptions.forEach(sub => sendPushNotification(sub, payload));
                }
            }

            const client = await getUserById(newInterventionData.clientId);
            if (client && client.email && notifyClient) {
                const autologinToken = await createAutologinToken(client.id);
                const baseUrl = company.platformUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://work.mannatec.it';
                
                await sendClientUpdateEmail({
                    recipientEmail: client.email,
                    clientName: client.name,
                    interventionId: newInterventionData.id,
                    interventionTitle: newInterventionData.title,
                    interventionStatus: newInterventionData.status,
                    updateMessage: 'creato',
                    company: company,
                    interventionLink: `${baseUrl}/login?autologin_token=${autologinToken}`,
                    notifyClient: true,
                });
            }
        }
    }
    
    return newInterventionData;
}


export async function addScheduledMaintenance(maintenanceData: Omit<ScheduledMaintenance, 'id' | 'status' | 'sla' | 'createdAt' | 'isMaintenance' | 'nextDueDate' | 'updates'>): Promise<ScheduledMaintenance> {
    const nextDueDate = new Date().toISOString();
    
    const newId = generateShortId();
    const newMaintenanceData: ScheduledMaintenance = {
        ...maintenanceData,
        id: newId,
        status: 'Pianificato',
        sla: '48h',
        createdAt: new Date().toISOString(),
        isMaintenance: true,
        nextDueDate,
        updates: [{ date: new Date().toISOString(), description: 'Manutenzione programmata creata.', userName: 'Sistema' }],
        dueDate: maintenanceData.dueDate || null,
        type: 'standard'
    };

    await setDoc(doc(db, 'interventions', newId), newMaintenanceData);
    return newMaintenanceData;
}


export async function updateIntervention(id: string, updatedData: Partial<Intervention> & { notifyClient?: boolean }, updater: User): Promise<Intervention | null> {
    try {
        const docRef = doc(db, 'interventions', id);
        const originalDocSnap = await getDoc(docRef);
        if (!originalDocSnap.exists()) return null;
        const originalIntervention = originalDocSnap.data() as Intervention;
        
        const { notifyClient, ...dataToUpdate } = { ...updatedData };

        const appConfig = await getAppConfiguration();
        if (appConfig && appConfig.gcsBucketName && dataToUpdate.attachments) {
            const newAttachments = (dataToUpdate.attachments as Attachment[]).filter(
                att => att.url.startsWith('data:')
            );

            if (newAttachments.length > 0) {
                 for (let i = 0; i < newAttachments.length; i++) {
                    const attachment = newAttachments[i];
                    try {
                        const uploadResult = await uploadFileToGcs({
                            fileDataUri: attachment.url,
                            fileName: `${id}/${attachment.id}-${attachment.name}`,
                            config: {
                                projectId: appConfig.gcsProjectId!,
                                clientEmail: appConfig.gcsClientEmail!,
                                privateKey: appConfig.gcsPrivateKey!,
                                bucketName: appConfig.gcsBucketName!,
                            }
                        });

                        if (uploadResult.success && uploadResult.fileUrl) {
                            const originalIndex = dataToUpdate.attachments.findIndex((att: Attachment) => att.id === attachment.id);
                            if (originalIndex > -1) {
                                dataToUpdate.attachments[originalIndex].url = uploadResult.fileUrl;
                            }
                        } else {
                            throw new Error(uploadResult.error || 'Upload failed');
                        }
                    } catch(uploadError) {
                        console.error("Failed to upload attachment:", uploadError);
                    }
                }
            }
        }
        
        if ('dueDate' in dataToUpdate && dataToUpdate.dueDate === undefined) dataToUpdate.dueDate = null;
        if ('completedAt' in dataToUpdate && dataToUpdate.completedAt === undefined) delete dataToUpdate.completedAt;
        else if ('completedAt' in dataToUpdate && dataToUpdate.completedAt === null) dataToUpdate.completedAt = null;

        const statusChanged = originalIntervention.status !== dataToUpdate.status;
        
        const oldUpdates = originalIntervention.updates || [];
        const newUpdatesProvided = updatedData.updates || [];
        const commentAdded = newUpdatesProvided.length > oldUpdates.length;

        let latestUpdateMessage = '';
        if (commentAdded) {
            const newUpdate = newUpdatesProvided[0];
             dataToUpdate.updates![0] = {
                ...newUpdate,
                readBy: [updater.id],
            };
            latestUpdateMessage = `${newUpdate.userName} ha aggiunto un aggiornamento: "${newUpdate.description}"`
        }

        if (statusChanged) {
            latestUpdateMessage = `Lo stato è stato aggiornato a: ${dataToUpdate.status}`;
        }
        
        await updateDoc(docRef, dataToUpdate as any);
        const interventionForNotif = { ...originalIntervention, ...dataToUpdate } as Intervention;


        if (statusChanged || commentAdded) {
            const internalRecipients: string[] = [];
            if (interventionForNotif.assignedOperatorId && interventionForNotif.assignedOperatorId !== updater.id) {
                internalRecipients.push(interventionForNotif.assignedOperatorId);
            }
            if (['Client', 'Operator'].includes(updater.role)) {
                const qAdmins = query(collection(db, 'users'), where("companyId", "==", interventionForNotif.companyId), where("role", "==", "Admin"));
                const adminsSnapshot = await getDocs(qAdmins);
                adminsSnapshot.docs.forEach(doc => {
                    if (doc.id !== updater.id) {
                         internalRecipients.push(doc.id);
                    }
                });
            }

            const uniqueInternalRecipients = [...new Set(internalRecipients)];
            for (const userId of uniqueInternalRecipients) {
                const baseMessage = `${updater.name} ha aggiornato l'intervento #${interventionForNotif.id}: "${interventionForNotif.title}"`;
                const inAppMessage = `${baseMessage}. ${latestUpdateMessage}`;
                
                await addDoc(collection(db, 'notifications'), {
                    userId: userId,
                    companyId: interventionForNotif.companyId,
                    message: inAppMessage,
                    read: false,
                    createdAt: new Date().toISOString(),
                    relatedInterventionId: interventionForNotif.id,
                    type: 'status_change'
                });
                
                const recipientUser = await getUserById(userId);
                if (recipientUser && recipientUser.pushSubscriptions && recipientUser.pushSubscriptions.length > 0) {
                     const payload = JSON.stringify({
                        title: 'Aggiornamento Intervento',
                        body: `Stato intervento #${id}: ${interventionForNotif.status}`,
                        data: { url: `/dashboard/interventions?id=${id}` },
                    });
                    recipientUser.pushSubscriptions.forEach(sub => sendPushNotification(sub, payload));
                }
            }

            if (notifyClient) {
                const client = await getUserById(interventionForNotif.clientId);
                const companyDocRef = doc(db, 'companies', interventionForNotif.companyId);
                const companyDoc = await getDoc(companyDocRef);

                if (client && client.email && companyDoc.exists()) {
                    const company: Company = {id: companyDoc.id, ...companyDoc.data()};
                    if(company.resendApiKey && company.senderEmail) {
                        const autologinToken = await createAutologinToken(client.id);
                        const baseUrl = company.platformUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://work.mannatec.it';
                         await sendClientUpdateEmail({
                            recipientEmail: client.email,
                            clientName: client.name,
                            interventionId: id,
                            interventionTitle: interventionForNotif.title,
                            interventionStatus: interventionForNotif.status,
                            updateMessage: latestUpdateMessage,
                            company: company,
                            interventionLink: `${baseUrl}/login?autologin_token=${autologinToken}`,
                            notifyClient: true
                        });
                    }
                }
            }
        }
        
        const updatedDoc = await getDoc(docRef);
        return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as Intervention : null;
    } catch (error) {
        console.error("Error updating intervention:", error);
        return null;
    }
}

export async function markInterventionUpdateAsRead(interventionId: string, updateDate: string, userId: string): Promise<boolean> {
    try {
        const docRef = doc(db, 'interventions', interventionId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            return false;
        }

        const intervention = docSnap.data() as Intervention;
        const updates = intervention.updates || [];

        const updateIndex = updates.findIndex(u => u.date === updateDate);
        if (updateIndex === -1) {
            return false;
        }
        
        const updateToModify = updates[updateIndex];
        const readBy = updateToModify.readBy || [];

        if (!readBy.includes(userId)) {
            updates[updateIndex] = { ...updateToModify, readBy: [...readBy, userId] };
            await updateDoc(docRef, { updates: updates });
        }
        
        return true;
    } catch (error) {
        console.error("Error marking update as read:", error);
        return false;
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
            const completionDate = new Date();
            combinedData.nextDueDate = addMonths(completionDate, combinedData.recurrenceMonths!).toISOString();
            combinedData.dueDate = completionDate.toISOString();
            combinedData.status = 'Pianificato';
        } else if (updatedData.recurrenceMonths || updatedData.dueDate) {
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
        const batch = writeBatch(db);

        const notificationsQuery = query(collection(db, 'notifications'), where('relatedInterventionId', '==', id));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        notificationsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const interventionRef = doc(db, 'interventions', id);
        batch.delete(interventionRef);
        
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error deleting intervention:", error);
        return false;
    }
}

export async function deleteScheduledMaintenance(id: string): Promise<boolean> {
     try {
        const batch = writeBatch(db);

        const notificationsQuery = query(collection(db, 'notifications'), where('relatedInterventionId', '==', id));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        notificationsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const maintenanceRef = doc(db, 'interventions', id);
        batch.delete(maintenanceRef);
        
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error deleting maintenance:", error);
        return false;
    }
}

// --- APPOINTMENTS MANAGEMENT (Firestore Implementation) ---

export async function getAppointments(companyId: string): Promise<Appointment[]> {
    if (!companyId) return [];
    try {
        const appointmentsQuery = query(collection(db, 'appointments'), where("companyId", "==", companyId));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));

        return appointments;
    } catch (error) {
        console.error("Error fetching appointments:", error);
        return [];
    }
}

export async function getAllAppointments(): Promise<Appointment[]> {
    try {
        const appointmentsSnapshot = await getDocs(collection(db, 'appointments'));
        const appointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        
        return appointments;
    } catch (error) {
        console.error("Error fetching all appointments:", error);
        return [];
    }
}

export async function addAppointment(appointmentData: Omit<Appointment, 'id' | 'status' | 'createdAt'>): Promise<Appointment> {
    const { clientId, companyId, ...restOfData } = appointmentData;

    const existingClient = await getUserById(clientId);
    let finalClientId = existingClient ? existingClient.id : null;

    if (!finalClientId) {
        console.log(`Client "${clientId}" not found by ID. Creating new client.`);

        const clientNameNormalized = clientId.split(" ").join(".").toLowerCase();

        const clientEmail = `${clientNameNormalized}@mannatec.it`;

        const newClient = await addUser({
            name: clientId,
            email: clientEmail, 
            role: 'Client',
            companyId: companyId,
            address: appointmentData.address,
            phone: null,
        });
        if (!newClient) {
             throw new Error(`Non è stato possibile creare il cliente. L'email ${clientEmail} potrebbe essere già in uso.`);
        }
        finalClientId = newClient.id;
    }

    const newId = generateShortId();
    const newAppointment: Appointment = {
        ...restOfData,
        id: newId,
        clientId: finalClientId,
        companyId: companyId,
        status: 'Pianificato',
        createdAt: new Date().toISOString(),
        date: appointmentData.date || null,
        address: appointmentData.address || null,
    };
    await setDoc(doc(db, 'appointments', newId), newAppointment);
    return newAppointment;
}

export async function updateAppointment(id: string, updatedData: Partial<Appointment>): Promise<Appointment | null> {
    try {
        let docRef = doc(db, 'appointments', id);
        let docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
             console.error(`No document found in 'appointments' with id ${id}`);
             return null;
        }
        
        await updateDoc(docRef, updatedData);
        const updatedDoc = await getDoc(docRef);
        return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as Appointment : null;
    } catch (error) {
        console.error("Error updating appointment:", error);
        return null;
    }
}

export async function deleteAppointment(id: string): Promise<boolean> {
    try {
        let docRef = doc(db, 'appointments', id);
        let docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            await deleteDoc(docRef);
            return true;
        }
        
        console.warn(`No appointment found with id ${id} to delete.`);
        return false;
        
    } catch (error) {
        console.error("Error deleting appointment:", error);
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


// --- SUPPORT TICKETS ---

export async function getSupportTickets(companyId: string, clientId?: string): Promise<SupportTicket[]> {
    if (!companyId) return [];
    try {
        let q: Query;
        if (clientId) {
            q = query(collection(db, 'supportTickets'), where("companyId", "==", companyId), where("clientId", "==", clientId));
        } else {
            q = query(collection(db, 'supportTickets'), where("companyId", "==", companyId));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
    } catch (error) {
        console.error("Error fetching support tickets:", error);
        return [];
    }
}

export async function addSupportTicket(ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'messages'> & { initialMessage: string, sender: User }): Promise<SupportTicket> {
    const newId = generateShortId();
    const now = new Date().toISOString();

    const initialMessage: SupportMessage = {
        id: uuidv4(),
        senderId: ticketData.sender.id,
        senderName: ticketData.sender.name,
        text: ticketData.initialMessage,
        createdAt: now,
    };

    const newTicket: SupportTicket = {
        id: newId,
        clientId: ticketData.clientId,
        clientName: ticketData.clientName,
        companyId: ticketData.companyId,
        subject: ticketData.subject,
        createdAt: now,
        updatedAt: now,
        status: 'Aperto',
        messages: [initialMessage],
    };

    await setDoc(doc(db, 'supportTickets', newId), newTicket);
    
    // Send notifications after creating the ticket
    await sendSupportTicketEmailNotification(newTicket.companyId, newTicket, true);

    return newTicket;
}

export async function addSupportMessage(ticketId: string, sender: User, messageText: string): Promise<void> {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);
    if (!ticketSnap.exists()) {
        throw new Error("Ticket not found");
    }

    const ticket = ticketSnap.data() as SupportTicket;
    const now = new Date().toISOString();
    
    const newMessage: SupportMessage = {
        id: uuidv4(),
        senderId: sender.id,
        senderName: sender.name,
        text: messageText,
        createdAt: now,
    };

    const updatedMessages = [...ticket.messages, newMessage];
    const updatedTicketData = {
        messages: updatedMessages,
        updatedAt: now,
        status: 'Aperto' as SupportTicketStatus,
    };

    await updateDoc(ticketRef, updatedTicketData);
    
    const updatedTicket = { ...ticket, ...updatedTicketData };
    
    // Send notifications after adding the message
    await sendSupportTicketEmailNotification(ticket.companyId, updatedTicket, false);
}

async function sendSupportTicketEmailNotification(companyId: string, ticket: SupportTicket, isNewTicket: boolean) {
    const company = await getCompanyById(companyId);
    if (!company || !company.resendApiKey || !company.senderEmail) {
        console.error(`Cannot send support email for company ${companyId}: Resend not configured.`);
        return;
    }

    const lastMessage = ticket.messages[ticket.messages.length - 1];
    const sender = await getUserById(lastMessage.senderId);

    const recipients: User[] = [];
    if (sender?.role === 'Client') {
        // Notify all admins in the company
        const adminsQuery = query(collection(db, 'users'), where("companyId", "==", companyId), where("role", "==", "Admin"));
        const adminsSnapshot = await getDocs(adminsQuery);
        adminsSnapshot.forEach(adminDoc => {
            recipients.push({ id: adminDoc.id, ...adminDoc.data() } as User);
        });
    } else { // Sender is Admin or Operator
        // Notify the client
        const client = await getUserById(ticket.clientId);
        if (client) recipients.push(client);
        
        // Notify other admins
        const adminsQuery = query(collection(db, 'users'), where("companyId", "==", companyId), where("role", "==", "Admin"));
        const adminsSnapshot = await getDocs(adminsQuery);
        adminsSnapshot.forEach(adminDoc => {
            // Add other admins to recipients, excluding the sender
            if (adminDoc.id !== sender?.id) {
                recipients.push({ id: adminDoc.id, ...adminDoc.data() } as User);
            }
        });
    }
    
    // Ensure unique recipients
    const uniqueRecipients = Array.from(new Map(recipients.map(item => [item.id, item])).values());

    for (const recipient of uniqueRecipients) {
        if (recipient.id === sender?.id) continue;

         await addDoc(collection(db, 'notifications'), {
            userId: recipient.id,
            companyId: companyId,
            message: `Nuova risposta da ${lastMessage.senderName} sul ticket: "${ticket.subject}"`,
            read: false, 
            createdAt: new Date().toISOString(),
            relatedInterventionId: ticket.id,
            type: 'generic'
        });

        if (recipient.email) {
            await triggerSupportTicketNotification({
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                ticket: ticket,
                isNewTicket: isNewTicket,
                resendConfig: {
                    apiKey: company.resendApiKey!,
                    from: company.senderEmail!,
                },
            });
        }
        
        if (recipient.pushSubscriptions && recipient.pushSubscriptions.length > 0) {
            const payload = JSON.stringify({
                title: isNewTicket ? `Nuovo Ticket: ${ticket.subject}` : `Nuova Risposta: ${ticket.subject}`,
                body: `${lastMessage.senderName}: ${lastMessage.text.substring(0, 100)}...`,
                data: { url: `/dashboard/support?id=${ticket.id}` },
            });
            recipient.pushSubscriptions.forEach(sub => sendPushNotification(sub, payload));
        }
    }
}


export async function updateSupportTicketStatus(ticketId: string, status: SupportTicketStatus): Promise<void> {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    await updateDoc(ticketRef, {
        status: status,
        updatedAt: new Date().toISOString(),
    });
}

export async function deleteSupportTicket(ticketId: string): Promise<boolean> {
    try {
        const batch = writeBatch(db);

        const notificationsQuery = query(collection(db, 'notifications'), where('relatedInterventionId', '==', ticketId));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        notificationsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const ticketRef = doc(db, 'supportTickets', ticketId);
        batch.delete(ticketRef);
        
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error deleting support ticket:", error);
        return false;
    }
}

