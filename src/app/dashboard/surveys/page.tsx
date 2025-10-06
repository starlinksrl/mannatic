
'use client';

import { Header } from '@/components/dashboard/header';
import { SurveysTable } from '@/components/dashboard/surveys-table';
import { getSurveys, getUsers, getClients } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User, Survey } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';


export default function SurveysPage() {
    const { user, currentCompany } = useUser();
    const [operators, setOperators] = useState<User[]>([]);
    const [clients, setClients] = useState<User[]>([]);
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user || !currentCompany) return;
        setLoading(true);

        const [allUsers, allClients, allSurveys] = await Promise.all([
            getUsers(currentCompany.id),
            getClients(currentCompany.id),
            getSurveys(currentCompany.id)
        ]);

        setOperators(allUsers.filter(u => u.role === 'Operator'));
        setClients(allClients);
        setSurveys(allSurveys);
        setLoading(false);
    }
    
    useEffect(() => {
        fetchData();
    }, [user, currentCompany]);

    const handleSurveyChange = () => {
        fetchData();
    }

    if (!user || loading) {
        return (
            <>
                <Header title="Gestione Sopralluoghi" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

  return (
    <>
      <Header title="Gestione Sopralluoghi" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <SurveysTable 
            surveys={surveys} 
            currentUser={user} 
            clients={clients} 
            operators={operators}
            onSurveyChange={handleSurveyChange}
        />
      </main>
    </>
  );
}
