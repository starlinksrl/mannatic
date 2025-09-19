
'use client';

import { Header } from '@/components/dashboard/header';
import { InterventionsTable } from '@/components/dashboard/interventions-table';
import { getInterventions, getUsers, getClients } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User, Intervention, Client } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';


export default function ClientRequestsPage() {
    const { user, currentCompany } = useUser();
    const router = useRouter();
    const [operators, setOperators] = useState<User[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.role !== 'Client') {
          router.push('/dashboard');
        }

        async function fetchData() {
            if (!user || !currentCompany) return;
            setLoading(true);
            
            if (user.role !== 'Client') {
              setLoading(false);
              return;
            }

            const [allUsers, allClients, allInterventions] = await Promise.all([
                getUsers(currentCompany.id),
                getClients(currentCompany.id),
                getInterventions(currentCompany.id)
            ]);

            setOperators(allUsers.filter(u => u.role === 'Operator'));
            setClients(allClients.filter(c => c.id === user.id));
            setInterventions(allInterventions.filter(i => i.clientId === user.id));
            setLoading(false);
        }
        fetchData();
    }, [user, currentCompany, router]);

    const handleInterventionAdded = (newIntervention: Intervention) => {
        setInterventions(prev => [newIntervention, ...prev]);
    }
    
    const handleInterventionUpdated = (updatedIntervention: Intervention) => {
        setInterventions(prev => prev.map(i => i.id === updatedIntervention.id ? updatedIntervention : i));
    }
    
    if (user?.role !== 'Client') {
      return null;
    }


    if (!user || loading) {
        return (
            <>
                <Header title="Le mie Richieste" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

  return (
    <>
      <Header title="Le mie Richieste" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <InterventionsTable 
            interventions={interventions} 
            currentUser={user} 
            clients={clients} 
            operators={operators} 
        />
      </main>
    </>
  );
}
