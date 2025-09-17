'use client';

import { Header } from '@/components/dashboard/header';
import { InterventionsTable } from '@/components/dashboard/interventions-table';
import { getInterventions, getUsers, clients } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User, Intervention, ScheduledMaintenance } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';


export default function InterventionsPage() {
    const { user } = useUser();
    const [operators, setOperators] = useState<User[]>([]);
    const [interventions, setInterventions] = useState<(Intervention | ScheduledMaintenance)[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!user) return;
            setLoading(true);
            const [allUsers, allInterventions] = await Promise.all([
                getUsers(),
                getInterventions()
            ]);
            setOperators(allUsers.filter(u => u.role === 'Operator'));
            setInterventions(allInterventions);
            setLoading(false);
        }
        fetchData();
    }, [user]);

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
      <Header title="Tutti gli Interventi" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <InterventionsTable interventions={interventions} currentUser={user} clients={clients} operators={operators} />
      </main>
    </>
  );
}
