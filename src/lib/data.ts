import { User, Client, Equipment, Intervention, ScheduledMaintenance, Notification, UserRole, InterventionPriority, InterventionStatus } from './types';
import { subDays, addDays, addMonths, addWeeks } from 'date-fns';

export let users: User[] = [
  { id: 'user-1', name: 'Mario Rossi', email: 'admin@schedulapro.com', role: 'Admin', avatarUrl: 'https://i.pravatar.cc/150?u=user-1', password: 'newpassword123' },
  { id: 'user-2', name: 'Luca Bianchi', email: 'operator1@schedulapro.com', role: 'Operator', avatarUrl: 'https://i.pravatar.cc/150?u=user-2', password: 'password123' },
  { id: 'user-3', name: 'Marco Verdi', email: 'operator2@schedulapro.com', role: 'Operator', avatarUrl: 'https://i.pravatar.cc/150?u=user-3', password: 'password123' },
  { id: 'user-4', name: 'Global Tech Inc.', email: 'client1@company.com', role: 'Client', avatarUrl: 'https://i.pravatar.cc/150?u=user-4', password: 'password123' },
  { id: 'user-5', name: 'Innovate Solutions', email: 'client2@company.com', role: 'Client', avatarUrl: 'https://i.pravatar.cc/150?u=user-5', password: 'password123' },
];

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

export let interventions: (Intervention | ScheduledMaintenance)[] = [
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

export function getClient(clientId: string) {
  return clients.find(c => c.id === clientId);
}

export function getEquipment(equipmentId: string) {
  return equipments.find(e => e.id === equipmentId);
}

export function getOperator(operatorId: string) {
  return users.find(u => u.id === operatorId && u.role === 'Operator');
}

export const initialUser = users[0]; // Default to Admin

// Functions to add data
export function addUser(userData: { name: string; email: string; role: UserRole, password?: string }): User {
  const newUser: User = {
    id: `user-${users.length + 1}`,
    ...userData,
    avatarUrl: `https://i.pravatar.cc/150?u=user-${users.length + 1}`,
  };
  users.push(newUser);
  
  // If the new user is a client, add to clients list as well
  if(newUser.role === 'Client' && !clients.find(c => c.name === newUser.name)) {
    const newClient: Client = {
      id: `client-${clients.length + 1}`,
      name: newUser.name,
    };
    clients.push(newClient);
  }

  return newUser;
}

export function updateUser(id: string, updatedData: Partial<User>): User | null {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
        return null;
    }
    const updatedUser = { ...users[index], ...updatedData };
    // Do not update password if it's empty
    if(updatedData.password === '') {
        delete updatedUser.password;
    }
    users[index] = updatedUser;

     // If the user is a client and the name changed, update the client list as well
    if(updatedUser.role === 'Client' && updatedData.name) {
        const clientIndex = clients.findIndex(c => c.id === `client-${index}`); // This is a bit brittle
        if(clientIndex !== -1) {
            clients[clientIndex].name = updatedUser.name;
        }
    }
    return updatedUser;
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
        id: `int-${interventions.length + 1}`,
        status: 'Nuovo',
        sla: '24h', // default sla
        createdAt: new Date().toISOString(),
        ...interventionData,
    };
    interventions = [newIntervention, ...interventions];
    return newIntervention;
}

export function updateIntervention(id: string, updatedData: Partial<Intervention>): Intervention | null {
    const index = interventions.findIndex(i => i.id === id);
    if (index === -1) {
        return null;
    }
    const updatedIntervention = { ...interventions[index], ...updatedData } as Intervention;
    interventions[index] = updatedIntervention;
    return updatedIntervention;
}
