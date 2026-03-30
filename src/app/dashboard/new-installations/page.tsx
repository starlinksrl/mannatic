'use client';

import { Header } from '@/components/dashboard/header';
import { InterventionsTable } from '@/components/dashboard/interventions-table';
import { getInterventions, getUsers, getClients } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User, Intervention } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Loader, PlusCircle } from 'lucide-react';
import { EditInterventionForm } from '@/components/dashboard/edit-intervention-form';
import { useInterventionModal } from '@/contexts/intervention-modal-context';
import { AddInterventionForm } from '@/components/dashboard/add-intervention-form';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';


export default function NewInstallationsPage() {
    const { user, currentCompany } = useUser();
    const [operators, setOperators] = useState<User[]>([]);
    const [clients, setClients] = useState<User[]>([]);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState(true);
    const { intervention: interventionToEdit, isOpen, closeModal } = useInterventionModal();
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialStatusFilter = useMemo(() => searchParams.get('status') || 'active', [searchParams]);
    const initialPriorityFilter = useMemo(() => searchParams.get('priority') || 'all', [searchParams]);
    const initialViewMode = useMemo(() => (searchParams.get('view') as 'table' | 'grid') || 'grid', [searchParams]);
    const initialSearchTerm = useMemo(() => searchParams.get('search') || '', [searchParams]);
    const initialClientFilter = useMemo(() => searchParams.get('client') || 'all', [searchParams]);

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
        // Filter for new installations
        setInterventions(allInterventions.filter(i => !i.isMaintenance && i.type === 'new_installation') as Intervention[]);
        setLoading(false);
    }

    useEffect(() => {
        if (user && user.role === 'Operator' && !user.allowedSectors?.includes('new_installations')) {
            router.push('/dashboard');
            return;
        }
        fetchData();
    }, [user, currentCompany]);

    const handleInterventionChange = () => {
        fetchData();
    }
    
    const handleClientUpdated = (updatedClient: User) => {
        setClients(prevClients => prevClients.map(c => c.id === updatedClient.id ? updatedClient : c));
    }

    if (!user || loading) {
        return (
            <>
                <Header title="Nuovi Impianti" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

  return (
    <>
      <Header title="Nuovi Impianti" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <div className="flex justify-end mb-4">
             {user && (user.role === 'Admin' || user.role === 'Operator' || user.role === 'Client') && (
                <AddInterventionForm
                    clients={clients}
                    operators={operators}
                    onInterventionAdded={handleInterventionChange}
                    currentUser={user}
                    defaultType="new_installation"
                >
                    <Button>
                        <PlusCircle className="mr-2" />
                        Crea Intervento
                    </Button>
                </AddInterventionForm>
            )}
        </div>
        <InterventionsTable 
            interventions={interventions} 
            currentUser={user} 
            clients={clients} 
            operators={operators}
            onInterventionChange={handleInterventionChange}
            initialStatusFilter={initialStatusFilter}
            initialPriorityFilter={initialPriorityFilter}
            initialViewMode={initialViewMode}
            initialSearchTerm={initialSearchTerm}
            initialClientFilter={initialClientFilter}
        />
      </main>
      {interventionToEdit && user && (
        <EditInterventionForm
            intervention={interventionToEdit}
            onInterventionUpdated={handleInterventionChange}
            onClientUpdated={handleClientUpdated}
            clients={clients}
            operators={operators}
            currentUser={user}
            isOpen={isOpen}
            setIsOpen={closeModal}
        />
      )}
    </>
  );
}
