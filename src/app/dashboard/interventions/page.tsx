
'use client';

import { Header } from '@/components/dashboard/header';
import { InterventionsTable } from '@/components/dashboard/interventions-table';
import { getInterventions, getUsers, getClients } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User, Intervention, Client } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';


export default function InterventionsPage() {
    const { user, currentCompany } = useUser();
    const [operators, setOperators] = useState<User[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user || !currentCompany) return;
        setLoading(true);

        const [allUsers, allClients, allInterventions] = await Promise.all([
            getUsers(currentCompany.id),
            getClients(currentCompany.id),
            getInterventions(currentCompany.id),
        ]);

        setOperators(allUsers.filter(u => u.role === 'Operator'));
        setClients(allClients);
        setInterventions(allInterventions.filter(i => !i.isMaintenance));
        setLoading(false);
    }

    useEffect(() => {
        fetchData();
    }, [user, currentCompany]);

    const handleInterventionChange = () => {
        fetchData();
    }
    
    const handleClientUpdated = (updatedClient: Client) => {
        setClients(prevClients => prevClients.map(c => c.id === updatedClient.id ? updatedClient : c));
    }

    if (!user || loading) {
        return (
            <>
                <Header title="Tutti gli Interventi" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

  return (
    <>
      <Header title="Tutti gli Interventi" onInterventionAdded={handleInterventionChange} clients={clients} operators={operators} />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <InterventionsTable 
            interventions={interventions} 
            currentUser={user} 
            clients={clients} 
            operators={operators}
            onClientUpdated={handleClientUpdated}
            onInterventionChange={handleInterventionChange}
        />
      </main>
    </>
  );
}
