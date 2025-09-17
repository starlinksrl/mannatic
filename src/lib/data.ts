
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
        const docRef = await addDoc(collection(db, 'companies'), companyData);
        // Create an admin user for the new company
        await addUser({
            name: `Admin ${companyData.name}`,
            email: companyData.email!,
            password: companyData.password!,
            role: 'Admin',
            companyId: docRef.id
        });
        return { id: docRef.id, ...companyData };
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
    const docRef = await addDoc(collection(db, 'users'), {
        ...userData,
        avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}`,
    });
    
    return { id: docRef.id, ...userData, avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}` } as User;
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
// These are still mock, should be migrated to Firestore if they become complex entities.

export async function getClients(companyId: string): Promise<Client[]> {
  if (!companyId) return [];
  // For now, clients are derived from Client Users.
  const users = await getUsers(companyId);
  const clientUsers = users.filter(u => u.role === 'Client');
  const clients = clientUsers.map(u => ({ id: u.id, name: u.name, companyId: u.companyId }));
  return clients;
}

export function getClient(clientId: string) {
    // This is tricky now. We need to find a user with this ID.
    // This is a placeholder until clients are a full-fledged collection.
    const user = getUserById(clientId);
    return user;
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
                equipmentId: maint.equipmentId,
                description: `Creato automaticamente dalla manutenzione programmata: ${maint.description}`,
                priority: 'Bassa',
                sla: '48h',
                status: 'Nuovo',
                assignedOperatorId: maint.assignedOperatorId,
                createdAt: new Date().toISOString(),
                dueDate: maint.nextDueDate,
                updates: [{date: new Date().toISOString(), description: `Creato da manutenzione #${maint.id}`}],
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
    
    const q = query(collection(db, 'interventions'), where("companyId", "==", companyId), where("isMaintenance", "!=", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Intervention));
}

export async function getScheduledMaintenance(companyId: string): Promise<ScheduledMaintenance[]> {
    if (!companyId) return [];
    await checkAndConvertMaintenance(companyId);

    const q = query(collection(db, 'interventions'), where("companyId", "==", companyId), where("isMaintenance", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledMaintenance));
}

export async function addIntervention(interventionData: Omit<Intervention, 'id' | 'status' | 'sla' | 'createdAt' | 'updates'>): Promise<Intervention> {
    const newInterventionData = {
        ...interventionData,
        status: 'Nuovo' as InterventionStatus,
        sla: '24h',
        createdAt: new Date().toISOString(),
        updates: [{ date: new Date().toISOString(), description: 'Intervento creato.' }],
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
        updates: [{ date: new Date().toISOString(), description: 'Manutenzione programmata creata.' }],
    };
    const docRef = await addDoc(collection(db, 'interventions'), newMaintenanceData);
    return { id: docRef.id, ...newMaintenanceData };
}

export async function updateIntervention(id: string, updatedData: Partial<Intervention>): Promise<Intervention | null> {
    try {
        const docRef = doc(db, 'interventions', id);
        await updateDoc(docRef, updatedData);
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
        if (notifications.length === 0) {
            const batch = writeBatch(db);
            const demoNotifications = [
                { userId: 'user-admin-1', message: 'Rischio di SLA per intervento #1023', read: false, createdAt: subDays(new Date(), 1).toISOString(), companyId },
                { userId: 'user-operator-1', message: 'Nuovo intervento #1024 assegnato', read: false, createdAt: new Date().toISOString(), companyId },
                { userId: 'user-client-1', message: 'Intervento #1021 completato', read: true, createdAt: subDays(new Date(), 2).toISOString(), companyId },
            ];
            demoNotifications.forEach(notif => {
                const docRef = doc(collection(db, 'notifications')); // auto-generate ID
                batch.set(docRef, notif);
            });
            await batch.commit();
            return demoNotifications as Notification[];
        }

        return notifications;
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
}
