
'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCompanies, getAllUsers, getAllInterventions, getAllAppointments, getAllNotifications, updateDocument } from '@/lib/data';
import { Company, User, Intervention, ScheduledMaintenance, Appointment as Survey, Notification } from '@/lib/types';
import { DataExplorer } from '@/components/dashboard/data-explorer';

type Data = {
    companies: Company[];
    users: User[];
    interventions: (Intervention | ScheduledMaintenance)[];
    surveys: Survey[];
    notifications: Notification[];
}

type CollectionName = keyof Data;


export default function ExplorerPage() {
    const { user } = useUser();
    const router = useRouter();
    const [data, setData] = useState<Data | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        const [companies, users, interventions, surveys, notifications] = await Promise.all([
            getCompanies(undefined, true),
            getAllUsers(),
            getAllInterventions(),
            getAllAppointments(),
            getAllNotifications(),
        ]);
        setData({ companies, users, interventions, surveys, notifications });
        setIsLoading(false);
    }

    useEffect(() => {
        if(user && user.role !== 'Creator') {
            router.push('/dashboard');
            return;
        }
        if (user) {
            fetchData();
        }
    }, [user, router]);


    if (isLoading || !user || !data) {
        return (
            <>
                <Header title="Data Explorer" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

    if (user.role !== 'Creator') {
        return null;
    }

    const collectionNames: CollectionName[] = ['companies', 'users', 'interventions', 'surveys', 'notifications'];

    return (
        <>
            <Header title="Data Explorer" />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                 <Tabs defaultValue="companies" className="w-full">
                    <TabsList>
                        {collectionNames.map(name => (
                             <TabsTrigger key={name} value={name}>{name.charAt(0).toUpperCase() + name.slice(1)}</TabsTrigger>
                        ))}
                    </TabsList>
                     {collectionNames.map(name => (
                        <TabsContent key={name} value={name} className="pt-4">
                            <DataExplorer data={data[name]} collectionName={name} onDataChange={fetchData} />
                        </TabsContent>
                     ))}
                </Tabs>
            </main>
        </>
    );
}

    
