

'use client';

import { Header } from '@/components/dashboard/header';
import { getInterventions, getUsers, getClients } from '@/lib/data';
import { Intervention, ScheduledMaintenance, Client, User, InterventionUpdate } from '@/lib/types';
import { isAfter } from 'date-fns';
import { KpiDashboard } from '@/components/dashboard/kpi-dashboard';
import { useUser } from '@/contexts/user-context';
import { useEffect, useState } from 'react';
import { Loader, PlusCircle } from 'lucide-react';
import { GenerateKpiDashboardInput } from '@/ai/flows/generate-kpi-dashboard';
import { Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { useInterventionModal } from '@/contexts/intervention-modal-context';
import { EditInterventionForm } from '@/components/dashboard/edit-intervention-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddInterventionForm } from '@/components/dashboard/add-intervention-form';
import { Button } from '@/components/ui/button';


export type EnrichedUpdate = InterventionUpdate & { 
  interventionTitle: string; 
  interventionId: string;
  clientName: string;
};

type KpiData = GenerateKpiDashboardInput & { 
  operatorWorkloadData: { name: string, workload: number }[],
  highPriorityInterventions: (Intervention | ScheduledMaintenance)[],
  latestUpdates: EnrichedUpdate[],
  allInterventions: (Intervention | ScheduledMaintenance)[],
};

export default function DashboardPage() {
  const { user, currentCompany } = useUser();
  const router = useRouter();
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const { intervention: interventionToEdit, isOpen, closeModal } = useInterventionModal();


  const fetchKpiData = async () => {
    if (!currentCompany || !user) {
        setLoading(false);
        return;
    };

    setLoading(true);

    const now = new Date();
    const [allInterventions, users, allClients] = await Promise.all([
      getInterventions(currentCompany.id),
      getUsers(currentCompany.id),
      getClients(currentCompany.id),
    ]);

    const clientsMap = new Map(allClients.map(c => [c.id, c.name]));
    setClients(allClients);
    setOperators(users.filter(u => u.role === 'Operator'));
    
    let relevantInterventions: (Intervention | ScheduledMaintenance)[];
    if (user.role === 'Client') {
        relevantInterventions = allInterventions.filter(i => i.clientId === user.id);
    } else if (user.role === 'Operator') {
        relevantInterventions = allInterventions.filter(i => i.assignedOperatorId === user.id || !i.assignedOperatorId);
    } else {
        relevantInterventions = allInterventions;
    }


    const openInterventions = relevantInterventions.filter(i => i.status === 'Nuovo' || i.status === 'In corso' || i.status === 'In attesa');
    const closedInterventions = relevantInterventions.filter(i => i.status === 'Completato' || i.status === 'Annullato');
    
    const totalClosedOrInProgress = relevantInterventions.filter(i => i.status === 'Completato' || i.status === 'In corso');
    const onTime = totalClosedOrInProgress.filter(i => {
      if(i.completedAt) {
        return !isAfter(new Date(i.completedAt), new Date(i.dueDate!));
      }
      return !isAfter(now, new Date(i.dueDate!));
    });
    const slaAdherencePercentage = totalClosedOrInProgress.length > 0 ? Math.round((onTime.length / totalClosedOrInProgress.length) * 100) : 100;

    const overdueMaintenanceTasks = relevantInterventions.filter(i => {
      const isMaintenance = 'periodicity' in i;
      return isMaintenance && (i.status === 'Nuovo' || i.status === 'In corso') && isAfter(now, new Date(i.dueDate!));
    }).length;
    
    const operatorWorkload: Record<string, number> = {};
    users.filter(u => u.role === 'Operator').forEach(op => {
      operatorWorkload[op.name] = allInterventions.filter(i => i.assignedOperatorId === op.id && (i.status === 'Nuovo' || i.status === 'In corso' || i.status === 'In attesa')).length;
    });

    const operatorWorkloadData = Object.entries(operatorWorkload).map(([name, workload]) => ({ name, workload }));

    const highPriorityInterventions = relevantInterventions.filter(i => i.priority === 'Alta' || i.priority === 'Critica').slice(0, 3);
    
    const latestUpdates: EnrichedUpdate[] = relevantInterventions
      .flatMap(i => (i.updates || []).map(u => ({ 
          ...u, 
          interventionTitle: i.title,
          interventionId: i.id,
          clientName: clientsMap.get(i.clientId) || 'Cliente non trovato'
      })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    setKpiData({
      openInterventions: openInterventions.length,
      closedInterventions: closedInterventions.length,
      slaAdherencePercentage,
      overdueMaintenanceTasks,
      operatorWorkload,
      operatorWorkloadData,
      highPriorityInterventions,
      latestUpdates,
      allInterventions: relevantInterventions,
    });
    setLoading(false);
  }

  useEffect(() => {
    if (user?.role === 'Creator' && !currentCompany) {
      router.replace('/dashboard/companies');
      return;
    }
    
    if (user) {
      fetchKpiData();
    }
  }, [user, currentCompany, router]);

  const NoCompanySelected = () => (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Building className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-semibold">Nessuna azienda selezionata</h2>
        <p className="mt-2 text-muted-foreground">Seleziona un'azienda dal menu in alto a destra per visualizzare la dashboard.</p>
    </div>
  )
  
  if (user?.role === 'Creator' && !currentCompany) {
      return (
         <>
            <Header title="Dashboard" />
            <NoCompanySelected />
        </>
      )
  }
  
    const handleClientUpdated = (updatedClient: Client) => {
        setClients(prevClients => prevClients.map(c => c.id === updatedClient.id ? updatedClient : c));
    }


  return (
    <>
      <Header title="Dashboard" onInterventionAdded={fetchKpiData} clients={clients} operators={operators} />
      <ScrollArea className="flex-1">
        <main className="p-4 md:p-6 lg:p-8">
          {loading || !kpiData || !user ? (
            <div className="flex items-center justify-center flex-1 h-full">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
                {(user.role === 'Operator' || user.role === 'Admin') && (
                    <AddInterventionForm
                        clients={clients}
                        operators={operators}
                        onInterventionAdded={fetchKpiData}
                        currentUser={user}
                    >
                        <Button size="lg" className="w-full">
                            <PlusCircle className="mr-2" />
                            Crea Intervento
                        </Button>
                    </AddInterventionForm>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 flex flex-col gap-6">
                    <ActivityFeed interventions={kpiData.allInterventions} latestUpdates={kpiData.latestUpdates} onUpdate={fetchKpiData} />
                  </div>
                  <div className="lg:col-span-2">
                    <KpiDashboard kpiData={kpiData} currentUser={user} />
                  </div>
                </div>
            </div>
          )}
        </main>
      </ScrollArea>
      {interventionToEdit && user && (
        <EditInterventionForm
            intervention={interventionToEdit}
            onInterventionUpdated={fetchKpiData}
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
