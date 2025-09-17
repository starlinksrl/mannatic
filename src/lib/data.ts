
import { User, Client, Equipment, Intervention, ScheduledMaintenance, Notification, UserRole, InterventionPriority, InterventionStatus, Company } from './types';
import { subDays, addDays, addMonths, addWeeks, isWithinInterval, startOfToday } from 'date-fns';
import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';


export let companies: Company[] = [
  { id: 'company-1', name: 'Azienda Demo 1' },
  { id: 'company-2', name: 'Azienda Demo 2' },
];

export let clients: Client[] = [
  { id: 'client-1', name: 'Global Tech Inc.', companyId: 'company-1' },
  { id: 'client-2', name: 'Innovate Solutions', companyId: 'company-1' },
  { id: 'client-3', name: 'NextGen Innovations', companyId: 'company-2' },
];

export let equipments: Equipment[] = [
  { id: 'equip-1', name: 'Impianto Clima A', clientId: 'client-1', companyId: 'company-1' },
  { id: 'equip-2', name: 'Server Room', clientId: 'client-1', companyId: 'company-1' },
  { id: 'equip-3', name: 'Linea Produzione B', clientId: 'client-2', companyId: 'company-1' },
  { id: 'equip-4', name: 'Ufficio A', clientId: 'client-3', companyId: 'company-2' },
];

const now = new Date();

let interventionsMock: (Intervention | ScheduledMaintenance)[] = [
  {
    id: 'int-1',
    title: 'Riparazione perdita condizionatore',
    clientId: 'client-1',
    equipmentId: 'equip-1',
    description: 'Perdita d\'acqua dall\'unità interna. Si prega di controllare urgentemente.',
    priority: 'Alta',
    sla: '4h',
    status: 'In corso',
    assignedOperatorId: 'user-2',
    createdAt: subDays(now, 2).toISOString(),
    dueDate: addDays(now, 1).toISOString(),
    updates: [
        { date: subDays(now, 1).toISOString(), description: "Contattato il cliente, appuntamento fissato per domani." },
        { date: subDays(now, 2).toISOString(), description: "Intervento creato dal sistema." },
    ],
    companyId: 'company-1'
  },
  {
    id: 'int-2',
    title: 'Sostituzione filtro aria',
    clientId: 'client-2',
    equipmentId: 'equip-3',
    description: 'Filtro aria intasato, performance ridotte.',
    priority: 'Media',
    sla: '24h',
    status: 'Nuovo',
    assignedOperatorId: null,
    createdAt: subDays(now, 1).toISOString(),
    dueDate: addDays(now, 3).toISOString(),
    updates: [],
    companyId: 'company-1'
  },
  {
    id: 'int-3',
    title: 'Controllo trimestrale Server Room',
    clientId: 'client-1',
    equipmentId: 'equip-2',
    description: 'Manutenzione programmata per la server room.',
    priority: 'Media',
    sla: '48h',
    status: 'Da Fatturare',
    assignedOperatorId: 'user-3',
    createdAt: subDays(now, 15).toISOString(),
    dueDate: subDays(now, 12).toISOString(),
    completedAt: subDays(now, 12).toISOString(),
    timeSpent: 4,
    materialsUsed: [{ name: 'Filtro HEPA', quantity: 2 }],
    clientSignature: 'F. Neri',
    isMaintenance: true,
    periodicity: 'monthly',
    recurrenceMonths: 3,
    checklist: [{ task: 'Pulizia filtri', completed: true }, { task: 'Controllo temperature', completed: true }],
    nextDueDate: addDays(now, 5).toISOString(),
    companyId: 'company-1'
  },
  {
    id: 'int-4',
    title: 'Verifica surriscaldamento linea',
    clientId: 'client-2',
    equipmentId: 'equip-3',
    description: 'La linea di produzione B mostra segni di surriscaldamento anomalo.',
    priority: 'Critica',
    sla: '2h',
    status: 'In attesa',
    assignedOperatorId: 'user-2',
    createdAt: subDays(now, 1).toISOString(),
    dueDate: addDays(now, 0).toISOString(),
    updates: [],
    companyId: 'company-1'
  },
  {
    id: 'int-5',
    title: 'Manutenzione settimanale',
    clientId: 'client-1',
    equipmentId: 'equip-1',
    description: 'Manutenzione ordinaria impianto clima.',
    priority: 'Bassa',
    sla: '7d',
    status: 'Pianificato',
    assignedOperatorId: 'user-3',
    createdAt: subDays(now, 0).toISOString(),
    dueDate: addWeeks(now, 1).toISOString(),
    isMaintenance: true,
    periodicity: 'weekly',
    recurrenceMonths: 0,
    checklist: [{ task: 'Controllo pressione gas', completed: false }, { task: 'Pulizia unità esterna', completed: false }],
    nextDueDate: addWeeks(now, 1).toISOString(),
    updates: [],
    companyId: 'company-1'
  },
  {
    id: 'int-6',
    title: 'Richiesta di upgrade',
    clientId: 'client-1',
    equipmentId: 'equip-2',
    description: 'Il cliente richiede una valutazione per un upgrade della capacità di raffreddamento.',
    priority: 'Bassa',
    sla: '14d',
    status: 'Fatturato',
    assignedOperatorId: 'user-2',
    createdAt: subDays(now, 20).toISOString(),
    dueDate: subDays(now, 5).toISOString(),
    updates: [],
    companyId: 'company-1'
  },
  {
    id: 'int-7',
    title: 'Guasto improvviso',
    clientId: 'client-2',
    equipmentId: 'equip-3',
    description: 'La macchina si è fermata improvvisamente.',
    priority: 'Alta',
    sla: '8h',
    status: 'Completato',
    assignedOperatorId: 'user-3',
    createdAt: subDays(now, 5).toISOString(),
    dueDate: subDays(now, 4).toISOString(),
    completedAt: subDays(now, 4).toISOString(),
    updates: [],
    companyId: 'company-1'
  },
  {
    id: 'int-8',
    title: 'Controllo mensile condizionatori',
    clientId: 'client-3',
    equipmentId: 'equip-4',
    description: 'Manutenzione ordinaria',
    priority: 'Media',
    sla: '48h',
    status: 'Pianificato',
    assignedOperatorId: null,
    createdAt: subDays(now, 3).toISOString(),
    dueDate: addDays(now, 10).toISOString(),
    isMaintenance: true,
    periodicity: 'monthly',
    recurrenceMonths: 1,
    checklist: [],
    nextDueDate: addDays(now, 10).toISOString(),
    updates: [],
    companyId: 'company-2'
  },
];

export const notifications: Notification[] = [
    { id: 'notif-1', userId: 'user-2', message: 'Nuovo intervento assegnato: #int-1 Riparazione perdita', read: false, createdAt: subDays(now, 2).toISOString(), companyId: 'company-1' },
    { id: 'notif-2', userId: 'user-3', message: 'Scadenza imminente (T-1): #int-5 Manutenzione settimanale', read: false, createdAt: subDays(now, 1).toISOString(), companyId: 'company-1' },
    { id: 'notif-3', userId: 'user-1', message: 'SLA a rischio per intervento #int-4', read: true, createdAt: subDays(now, 1).toISOString(), companyId: 'company-1' },
    { id: 'notif-4', userId: 'user-2', message: 'Intervento #int-4 in attesa di parti di ricambio.', read: false, createdAt: new Date().toISOString(), companyId: 'company-1' },
];

export async function getCompanies(): Promise<Company[]> {
    // In a real app, this would fetch from Firestore
    return Promise.resolve(companies);
}

export async function addCompany(companyName: string): Promise<Company> {
    const newCompany: Company = {
        id: `company-${companies.length + 1}`,
        name: companyName,
    };
    companies.push(newCompany);
     // In a real app, this would also create a default Admin user for the company
    return newCompany;
}


export async function getUsers(companyId: string): Promise<User[]> {
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

export function getClients(companyId: string): Client[] {
  return clients.filter(c => c.id === companyId);
}

export function getClient(clientId: string) {
  return clients.find(c => c.id === clientId);
}

export function getEquipments(companyId: string): Equipment[] {
    return equipments.filter(e => e.companyId === companyId);
}


export function getEquipment(equipmentId: string) {
  return equipments.find(e => e.id === equipmentId);
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

const CONVERSION_WINDOW_DAYS = 7;

function checkAndConvertMaintenance(companyId: string) {
    const today = startOfToday();
    const conversionInterval = {
        start: today,
        end: addDays(today, CONVERSION_WINDOW_DAYS),
    };

    const maintenancesToConvert = interventionsMock
        .filter(task => 'isMaintenance' in task && task.status === 'Pianificato' && task.companyId === companyId) as ScheduledMaintenance[];

    maintenancesToConvert.forEach(maint => {
        const nextDueDate = new Date(maint.nextDueDate);
        const alreadyConverted = interventionsMock.some(i => 
            i.title === maint.title && isWithinInterval(new Date(i.createdAt), {start: subDays(today, 2), end: addDays(today, 2)}));

        if (isWithinInterval(nextDueDate, conversionInterval) && !alreadyConverted) {
            console.log(`Converting maintenance ${maint.id} to intervention.`);
            
            const newIntervention: Intervention = {
                id: `conv-${maint.id}-${Math.random().toString(36).substring(2, 7)}`,
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

            interventionsMock.unshift(newIntervention);

            // Update original maintenance task
            const maintIndex = interventionsMock.findIndex(i => i.id === maint.id);
            if (maintIndex !== -1) {
                const updatedMaint = interventionsMock[maintIndex] as ScheduledMaintenance;
                updatedMaint.status = 'In corso';
                updatedMaint.nextDueDate = addMonths(new Date(updatedMaint.nextDueDate), updatedMaint.recurrenceMonths).toISOString();
                interventionsMock[maintIndex] = updatedMaint;
            }
        }
    });
}


// Functions to add data
export async function addUser(userData: Omit<User, 'id' | 'avatarUrl'>): Promise<User> {
  try {
    const docRef = await addDoc(collection(db, 'users'), {
        ...userData,
        avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}`,
    });
    
    // If the new user is a client, add to clients list as well
    if(userData.role === 'Client' && !clients.find(c => c.name === userData.name)) {
      const newClient: Client = {
        id: `client-${clients.length + 1}`,
        name: userData.name,
        companyId: userData.companyId
      };
      clients.push(newClient);
    }

    return { id: docRef.id, ...userData, avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}` } as User;
  } catch (error) {
      console.error("Error adding user:", error);
      throw new Error("Failed to add user.");
  }
}

export async function updateUser(id: string, updatedData: Partial<User>): Promise<User | null> {
    try {
        const userDocRef = doc(db, 'users', id);
        
        // Do not update password if it's empty
        if(updatedData.password === '') {
            delete updatedData.password;
        }
        
        await updateDoc(userDocRef, updatedData);
        
        const updatedUser = await getUserById(id);

        // If the user is a client and the name changed, update the client list as well
        if(updatedUser && updatedUser.role === 'Client' && updatedData.name) {
            const clientIndex = clients.findIndex(c => c.id === `client-${id.split('-')[1]}`); // This is a bit brittle
            if(clientIndex !== -1) {
                clients[clientIndex].name = updatedUser.name;
            }
        }
        return updatedUser;
    } catch (error) {
        console.error("Error updating user:", error);
        return null;
    }
}

export async function deleteUser(id: string): Promise<boolean> {
    const userToDelete = await getUserById(id);
    if (!userToDelete) return false;

    // This is mock, so we just log it. With a real DB, we'd delete.
    console.log(`User with id ${id} would be deleted.`);
    try {
        const userDocRef = doc(db, 'users', id);
        await deleteDoc(userDocRef);
        return true;
    } catch (error) {
        console.error("Error deleting user:", error);
        return false;
    }
}


export async function getInterventions(companyId: string): Promise<(Intervention | ScheduledMaintenance)[]> {
    checkAndConvertMaintenance(companyId);
    return Promise.resolve(interventionsMock.filter(i => !i.hasOwnProperty('isMaintenance') && i.companyId === companyId));
}

export async function getScheduledMaintenance(companyId: string): Promise<ScheduledMaintenance[]> {
     checkAndConvertMaintenance(companyId);
    return Promise.resolve(interventionsMock.filter(i => i.hasOwnProperty('isMaintenance') && i.companyId === companyId) as ScheduledMaintenance[]);
}

export function addIntervention(interventionData: Omit<Intervention, 'id' | 'status' | 'sla' | 'createdAt'>): Intervention {
    const newIntervention: Intervention = {
        id: `int-${interventionsMock.length + 1}`,
        status: 'Nuovo',
        sla: '24h', // default sla
        createdAt: new Date().toISOString(),
        ...interventionData,
        updates: [{ date: new Date().toISOString(), description: 'Intervento creato.' }],
    };
    interventionsMock = [newIntervention, ...interventionsMock];
    return newIntervention;
}


export function addScheduledMaintenance(maintenanceData: Omit<ScheduledMaintenance, 'id' | 'status' | 'sla' | 'createdAt' | 'isMaintenance' | 'nextDueDate'>): ScheduledMaintenance {
    const nextDueDate = addMonths(new Date(maintenanceData.dueDate), maintenanceData.recurrenceMonths).toISOString();
    
    const newMaintenance: ScheduledMaintenance = {
        id: `maint-${interventionsMock.length + 1}`,
        status: 'Pianificato',
        sla: '48h', // default sla
        createdAt: new Date().toISOString(),
        isMaintenance: true,
        nextDueDate,
        ...maintenanceData,
        updates: [{ date: new Date().toISOString(), description: 'Manutenzione programmata creata.' }],
    };
    interventionsMock = [newMaintenance, ...interventionsMock];
    return newMaintenance;
}


export function updateIntervention(id: string, updatedData: Partial<Intervention>): Intervention | null {
    const index = interventionsMock.findIndex(i => i.id === id);
    if (index === -1) {
        return null;
    }
    const updatedIntervention = { ...interventionsMock[index], ...updatedData } as Intervention;
    interventionsMock[index] = updatedIntervention;
    return updatedIntervention;
}

export function updateScheduledMaintenance(id: string, updatedData: Partial<ScheduledMaintenance>): ScheduledMaintenance | null {
    const index = interventionsMock.findIndex(i => i.id === id);
    if (index === -1) {
        return null;
    }

    const originalMaintenance = interventionsMock[index] as ScheduledMaintenance;
    const updatedMaintenance = { ...originalMaintenance, ...updatedData };

    // Recalculate next due date if recurrence or due date changes
    if (updatedData.recurrenceMonths || updatedData.dueDate) {
         updatedMaintenance.nextDueDate = addMonths(new Date(updatedMaintenance.dueDate), updatedMaintenance.recurrenceMonths).toISOString();
    }
    
    interventionsMock[index] = updatedMaintenance;
    return updatedMaintenance;
}

export function deleteIntervention(id: string): boolean {
    const index = interventionsMock.findIndex(i => i.id === id);
    if (index === -1) return false;
    interventionsMock.splice(index, 1);
    return true;
}

export function deleteScheduledMaintenance(id: string): boolean {
    const index = interventionsMock.findIndex(i => i.id === id);
    if (index === -1) return false;
    interventionsMock.splice(index, 1);
    return true;
}
