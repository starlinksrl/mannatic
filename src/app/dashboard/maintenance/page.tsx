'use client';

import { Header } from '@/components/dashboard/header';
import { getScheduledMaintenance, getUsers, getClients } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User, ScheduledMaintenance, Client } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { MaintenanceTable } from '@/components/dashboard/maintenance-table';


export default function MaintenancePage() {
    const { user, currentCompany } = useUser();
    const [operators, setOperators] = useState<User[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [maintenanceTasks, setMaintenanceTasks] = useState<ScheduledMaintenance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!user || !currentCompany) return;
            setLoading(true);
            const [allUsers, allClients, allMaintenance] = await Promise.all([
                getUsers(currentCompany.id),
                getClients(currentCompany.id),
                getScheduledMaintenance(currentCompany.id)
            ]);
            setOperators(allUsers.filter(u => u.role === 'Operator'));
            setClients(allClients);
            setMaintenanceTasks(allMaintenance);
            setLoading(false);
        }
        fetchData();
    }, [user, currentCompany]);
    
    const handleMaintenanceAdded = (newMaintenance: ScheduledMaintenance) => {
        setMaintenanceTasks(prev => [newMaintenance, ...prev]);
    }
    
    const handleMaintenanceUpdated = (updatedMaintenance: ScheduledMaintenance) => {
        setMaintenanceTasks(prev => prev.map(m => m.id === updatedMaintenance.id ? updatedMaintenance : m));
    }


    if (!user || loading) {
        return (
            <>
                <Header title="Manutenzioni Programmate" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

  return (
    <>
      <Header title="Manutenzioni Programmate" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <MaintenanceTable 
            maintenanceTasks={maintenanceTasks} 
            currentUser={user} 
            clients={clients} 
            operators={operators}
            onMaintenanceAdded={handleMaintenanceAdded}
            onMaintenanceUpdated={handleMaintenanceUpdated}
         />
      </main>
    </>
  );
}
