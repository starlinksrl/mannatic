

'use client';

import { Header } from '@/components/dashboard/header';
import { SurveysTable } from '@/components/dashboard/surveys-table';
import { getAppointments, getUsers, getClients } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User, Appointment } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';


export default function AppointmentsPage() {
    const { user, currentCompany } = useUser();
    const [operators, setOperators] = useState<User[]>([]);
    const [clients, setClients] = useState<User[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();


    const fetchData = async () => {
        if (!user || !currentCompany) return;
        setLoading(true);

        const [allUsers, allClients, allAppointments] = await Promise.all([
            getUsers(currentCompany.id),
            getClients(currentCompany.id),
            getAppointments(currentCompany.id)
        ]);

        setOperators(allUsers.filter(u => u.role === 'Operator'));
        setClients(allClients);
        setAppointments(allAppointments);
        setLoading(false);
    }
    
    useEffect(() => {
        if (user && user.role === 'Operator' && !user.allowedSectors?.includes('surveys')) {
            router.push('/dashboard');
            return;
        }
        fetchData();
    }, [user, currentCompany]);

    const handleAppointmentChange = () => {
        fetchData();
    }

    if (!user || loading) {
        return (
            <>
                <Header title="Gestione Appuntamenti" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

  return (
    <>
      <Header title="Gestione Appuntamenti" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <SurveysTable 
            surveys={appointments} 
            currentUser={user} 
            clients={clients} 
            operators={operators}
            onSurveyChange={handleAppointmentChange}
        />
      </main>
    </>
  );
}
