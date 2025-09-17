import { User, Client, Equipment, Intervention, ScheduledMaintenance, Notification, UserRole, InterventionPriority, InterventionStatus } from './types';
import { subDays, addDays, addMonths, addWeeks } from 'date-fns';
import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';


export let clients: Client[] = [
  { id: 'client-1', name: 'Global Tech Inc.' },
  { id: 'client-2', name: 'Innovate Solutions' },
];

export let equipments: Equipment[] = [
  { id: 'equip-1', name: 'Impianto Clima A', clientId: 'client-1' },
  { id: 'equip-2', name: 'Server Room', clientId: 'client-1' },
  { id: 'equip-3', name: 'Linea Produzione B', clientId: 'client-2' },
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
  },
  {
    id: 'int-3',
    title: 'Controllo trimestrale Server Room',
    clientId: 'client-1',
    equipmentId: 'equip-2',
    description: 'Manutenzione programmata per la server room.',
    priority: 'Media',
    sla: '48h',
    status: 'Completato',
    assignedOperatorId: 'user-3',
    createdAt: subDays(now, 15).toISOString(),
    dueDate: subDays(now, 12).toISOString(),
    completedAt: subDays(now, 12).toISOString(),
    timeSpent: 4,
    materialsUsed: [{ name: 'Filtro HEPA', quantity: 2 }],
    clientSignature: 'F. Neri',
    periodicity: 'monthly',
    checklist: [{ task: 'Pulizia filtri', completed: true }, { task: 'Controllo temperature', completed: true }],
    nextDueDate: addMonths(now, 2).toISOString(),
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
  },
  {
    id: 'int-5',
    title: 'Manutenzione settimanale',
    clientId: 'client-1',
    equipmentId: 'equip-1',
    description: 'Manutenzione ordinaria impianto clima.',
    priority: 'Bassa',
    sla: '7d',
    status: 'Nuovo',
    assignedOperatorId: 'user-3',
    createdAt: subDays(now, 0).toISOString(),
    dueDate: addWeeks(now, 1).toISOString(),
    periodicity: 'weekly',
    checklist: [{ task: 'Controllo pressione gas', completed: false }, { task: 'Pulizia unità esterna', completed: false }],
    nextDueDate: addWeeks(now, 1).toISOString(),
  },
  {
    id: 'int-6',
    title: 'Richiesta di upgrade',
    clientId: 'client-1',
    equipmentId: 'equip-2',
    description: 'Il cliente richiede una valutazione per un upgrade della capacità di raffreddamento.',
    priority: 'Bassa',
    sla: '14d',
    status: 'Annullato',
    assignedOperatorId: 'user-2',
    createdAt: subDays(now, 20).toISOString(),
    dueDate: subDays(now, 5).toISOString(),
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
  },
];

export const notifications: Notification[] = [
    { id: 'notif-1', userId: 'user-2', message: 'Nuovo intervento assegnato: #int-1 Riparazione perdita', read: false, createdAt: subDays(now, 2).toISOString() },
    { id: 'notif-2', userId: 'user-3', message: 'Scadenza imminente (T-1): #int-5 Manutenzione settimanale', read: false, createdAt: subDays(now, 1).toISOString() },
    { id: 'notif-3', userId: 'user-1', message: 'SLA a rischio per intervento #int-4', read: true, createdAt: subDays(now, 1).toISOString() },
    { id: 'notif-4', userId: 'user-2', message: 'Intervento #int-4 in attesa di parti di ricambio.', read: false, createdAt: new Date().toISOString() },
];

export async function getUsers(): Promise<User[]> {
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  return userList;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  const userDoc = querySnapshot.docs[0];
  return { id: userDoc.id, ...userDoc.data() } as User;
}

export async function getUserById(id: string): Promise<User | null> {
    if (!id) return null;
    const userDocRef = doc(db, 'users', id);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
}

export function getClient(clientId: string) {
  return clients.find(c => c.id === clientId);
}

export function getEquipment(equipmentId: string) {
  return equipments.find(e => e.id === equipmentId);
}

export async function getOperator(operatorId: string) {
  const user = await getUserById(operatorId);
  return user && user.role === 'Operator' ? user : null;
}


// Functions to add data
export async function addUser(userData: { name: string; email: string; role: UserRole, password?: string }): Promise<User> {
  const docRef = await addDoc(collection(db, 'users'), {
      ...userData,
      avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}`,
  });
  
  // If the new user is a client, add to clients list as well
  if(userData.role === 'Client' && !clients.find(c => c.name === userData.name)) {
    const newClient: Client = {
      id: `client-${clients.length + 1}`,
      name: userData.name,
    };
    clients.push(newClient);
  }

  return { id: docRef.id, ...userData, avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}` } as User;
}

export async function updateUser(id: string, updatedData: Partial<User>): Promise<User | null> {
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
}

export async function getInterventions(): Promise<(Intervention | ScheduledMaintenance)[]> {
    // For now, it returns mock data. This can be replaced with a Firestore query.
    return Promise.resolve(interventionsMock);
}

export function addIntervention(interventionData: {
  title: string;
  clientId: string;
  equipmentId: string;
  description: string;
  priority: InterventionPriority;
  dueDate: string;
  assignedOperatorId: string | null;
}): Intervention {
    const newIntervention: Intervention = {
        id: `int-${interventionsMock.length + 1}`,
        status: 'Nuovo',
        sla: '24h', // default sla
        createdAt: new Date().toISOString(),
        ...interventionData,
    };
    interventionsMock = [newIntervention, ...interventionsMock];
    return newIntervention;
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
