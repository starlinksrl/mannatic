

import { User, Client, Equipment, Intervention, ScheduledMaintenance, Notification, UserRole, InterventionPriority, InterventionStatus, Company } from './types';
import { subDays, addDays, addMonths, addWeeks, isWithinInterval, startOfToday } from 'date-fns';
import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, deleteDoc, writeBatch, documentId } from 'firebase/firestore';


// --- MOCK DATA (to be phased out or used for seeding) ---

let equipmentsMock: Equipment[] = [
  { id: 'equip-1', name: 'Impianto Clima A', clientId: 'client-1', companyId: 'company-1' },
  { id: 'equip-2', name: 'Server Room', clientId: 'client-1', companyId: 'company-1' },
  { id: 'equip-3', name: 'Linea Produzione B', clientId: 'client-2', companyId: 'company-1' },
  { id: 'equip-4', name: 'Ufficio A', clientId: 'client-3', companyId: 'company-2' },
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
        const docRef = await addDoc(collection(db, 'companies'), {
            name: companyData.name,
            address: companyData.address || '',
            vatNumber: companyData.vatNumber || '',
            taxCode: companyData.taxCode || '',
            phone: companyData.phone || '',
            uniqueCode: companyData.uniqueCode || '',
            email: companyData.email || '',
        });
        
        // Create an admin user for the new company
        await addUser({
            name: `Admin ${companyData.name}`,
            email: companyData.email!,
            password: companyData.password!,
            role: 'Admin',
            companyId: docRef.id
        });
        
        const newCompany: Company = {
            id: docRef.id,
            name: companyData.name,
            address: companyData.address,
            vatNumber: companyData.vatNumber,
            taxCode: companyData.taxCode,
            phone: companyData.phone,
            uniqueCode: companyData.uniqueCode,
            email: companyData.email,
        };

        return newCompany;

    } catch (error) {
        console.error("Error adding company:", error);
        throw new Error("Failed to add company.");
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
        
        if(updatedData.password === '') {
            delete updatedData.password;
        }

        if (updatedData.email) {
            updatedData.email = updatedData.email.toLowerCase();
        }
        
        await updateDoc(userDocRef, updatedData);
        
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


export async function getInterventions(companyId: string): Promise<Intervention[]> {
    if (!companyId) return [];
    await checkAndConvertMaintenance(companyId);
    
    const q = query(collection(db, 'interventions'), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    const allCompanyInterventions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Intervention | ScheduledMaintenance)));
    
    // Filter in code instead of in the query
    return allCompanyInterventions.filter(i => !('isMaintenance' in i) || i.isMaintenance !== true) as Intervention[];
}

export async function getScheduledMaintenance(companyId: string): Promise<ScheduledMaintenance[]> {
    if (!companyId) return [];
    await checkAndConvertMaintenance(companyId);

    const q = query(collection(db, 'interventions'), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    const allCompanyInterventions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Intervention | ScheduledMaintenance)));

    // Filter in code instead of in the query
    return allCompanyInterventions.filter(i => 'isMaintenance' in i && i.isMaintenance === true) as ScheduledMaintenance[];
}

type AddInterventionParams = Omit<Intervention, 'id' | 'status' | 'sla' | 'createdAt' | 'updates'> & { creatorName: string };

export async function addIntervention(interventionData: AddInterventionParams): Promise<Intervention> {
    const { creatorName, clientId, companyId, ...restOfData } = interventionData;
    
    // Check if clientId is an existing user or a new name
    const clients = await getClients(companyId);
    let finalClientId = clients.find(c => c.name === clientId)?.id;
    let newClientWasCreated = false;

    if (!finalClientId) {
        console.log(`Client "${clientId}" not found. Creating new client.`);
        const company = (await getDoc(doc(db, 'companies', companyId))).data();
        const companyName = company?.name.toLowerCase().replace(/[^a-z0-9]/gi, '');
        const clientNameNormalized = clientId.toLowerCase().replace(/[^a-z0-9]/gi, '');

        const newClient = await addUser({
            name: clientId,
            email: `${clientNameNormalized}@${companyName}.it`,
            password: '12345678',
            role: 'Client',
            companyId: companyId,
        });
        finalClientId = newClient.id;
        newClientWasCreated = true;
        console.log(`New client created with ID: ${finalClientId}`);
    }

    const newInterventionData = {
        ...restOfData,
        clientId: finalClientId,
        companyId: companyId,
        status: 'Nuovo' as InterventionStatus,
        sla: '24h',
        createdAt: new Date().toISOString(),
        updates: [{ date: new Date().toISOString(), description: `Creato da ${creatorName}.`, userName: creatorName }],
    };
    const docRef = await addDoc(collection(db, 'interventions'), newInterventionData);
    return { id: docRef.id, ...newInterventionData };
}


export async function addScheduledMaintenance(maintenanceData: Omit<ScheduledMaintenance, 'id' | 'status' | 'sla' | 'createdAt' | 'isMaintenance' | 'nextDueDate' | 'updates'>): Promise<ScheduledMaintenance> {
    const nextDueDate = addMonths(new Date(maintenanceData.dueDate), maintenanceData.recurrenceMonths).toISOString();
    
    const newMaintenanceData = {
        ...maintenanceData,
        status: 'Pianificato' as InterventionStatus,
        sla: '48h',
        createdAt: new Date().toISOString(),
        isMaintenance: true,
        nextDueDate,
        updates: [{ date: new Date().toISOString(), description: 'Manutenzione programmata creata.', userName: 'Sistema' }],
    };
    const docRef = await addDoc(collection(db, 'interventions'), newMaintenanceData);
    return { id: docRef.id, ...newMaintenanceData };
}

export async function updateIntervention(id: string, updatedData: Partial<Intervention>): Promise<Intervention | null> {
    try {
        const docRef = doc(db, 'interventions', id);
        
        const dataToUpdate = { ...updatedData };
        if (dataToUpdate.timeSpent === undefined) {
            dataToUpdate.timeSpent = null;
        }
        if (dataToUpdate.materialsUsed === undefined) {
            dataToUpdate.materialsUsed = null;
        }

        await updateDoc(docRef, dataToUpdate as Partial<Intervention>);
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
            combinedData.nextDueDate = addMonths(new Date(combinedData.dueDate), combinedData.recurrenceMonths).toISOString();
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

// --- NOTIFICATIONS ---

export async function getNotifications(companyId: string): Promise<Notification[]> {
    if (!companyId) return [];
    try {
        const q = query(collection(db, 'notifications'), where("companyId", "==", companyId));
        const snapshot = await getDocs(q);
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        
        // If no notifications, create some demo ones.
        if (notifications.length === 0 && companyId === 'company-1') { // Only for first company to avoid clutter
            const allUsers = await getUsers(companyId);
            const admin = allUsers.find(u => u.role === 'Admin');
            const operator = allUsers.find(u => u.role === 'Operator');
            const client = allUsers.find(u => u.role === 'Client');
            
            const batch = writeBatch(db);
            const demoNotifications = [];
            
            if(admin) demoNotifications.push({ userId: admin.id, message: 'Rischio di SLA per intervento #1023', read: false, createdAt: subDays(new Date(), 1).toISOString(), companyId });
            if(operator) demoNotifications.push({ userId: operator.id, message: 'Nuovo intervento #1024 assegnato', read: false, createdAt: new Date().toISOString(), companyId });
            if(client) demoNotifications.push({ userId: client.id, message: 'Intervento #1021 completato', read: true, createdAt: subDays(new Date(), 2).toISOString(), companyId });

            demoNotifications.forEach(notif => {
                const docRef = doc(collection(db, 'notifications')); // auto-generate ID
                batch.set(docRef, notif);
            });
            await batch.commit();
            
            const newSnapshot = await getDocs(q);
            return newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        }

        return notifications.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
}
