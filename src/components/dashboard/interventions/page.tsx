'use client';

import { Header } from '@/components/dashboard/header';
import { InterventionsTable } from '@/components/dashboard/interventions-table';
import { interventions, users as allUsers, clients } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User } from '@/lib/types';


export default function InterventionsPage() {
    const { user } = useUser();
    const operators = allUsers.filter(u => u.role === 'Operator') as User[];

    if (!user) return null;

  return (
    <>
      <Header title="Tutti gli Interventi" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <InterventionsTable interventions={interventions} currentUser={user} clients={clients} operators={operators} />
      </main>
    </>
  );
}
