

'use client';

import { Header } from '@/components/dashboard/header';
import { getInterventions, getUsers, getClients, updateUser, getSurveys } from '@/lib/data';
import { Intervention, ScheduledMaintenance, User, InterventionUpdate, Survey } from '@/lib/types';
import { isAfter, addDays, startOfToday } from 'date-fns';
import { useUser } from '@/contexts/user-context';
import { useEffect, useState, useMemo } from 'react';
import { Loader, PlusCircle, Wrench, HardHat, Check, AlertOctagon, Clock, Activity, Settings, RefreshCw, ClipboardCheck } from 'lucide-react';
import { GenerateKpiDashboardInput } from '@/ai/flows/generate-kpi-dashboard';
import { Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { useInterventionModal } from '@/contexts/intervention-modal-context';
import { EditInterventionForm } from '@/components/dashboard/edit-intervention-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddInterventionForm } from '@/components/dashboard/add-intervention-form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { QuoteOfTheDay } from '@/components/dashboard/quote-of-the-day';


export type EnrichedUpdate = InterventionUpdate & { 
  interventionTitle: string; 
  interventionId: string;
  clientName: string;
};

type KpiData = GenerateKpiDashboardInput & { 
  openInterventions: number;
  closedInterventions: number;
  slaAdherencePercentage: number;
  overdueMaintenanceTasks: number;
  operatorWorkloadData: { name: string, workload: number }[],
  highPriorityInterventions: (Intervention | ScheduledMaintenance)[],
  latestUpdates: EnrichedUpdate[],
  allInterventions: (Intervention | ScheduledMaintenance)[],
  dueSoonInterventions: Intervention[],
  dueSoonNewInstallations: Intervention[],
  openNewInstallations: number,
  openSurveys: number,
  openSurveysList: Survey[],
};


export default function DashboardPage() {
  const { user, setUser, currentCompany } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<User[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const { intervention: interventionToEdit, isOpen, closeModal, openModal } = useInterventionModal();
  
  const clientsMap = useMemo(() => {
    return new Map(clients.map(c => [c.id, c]));
  }, [clients]);

  const fetchKpiData = async () => {
    if (!currentCompany || !user) {
        setLoading(false);
        return;
    };

    setLoading(true);

    const now = new Date();
    const [allInterventions, users, allClients, allSurveys] = await Promise.all([
      getInterventions(currentCompany.id),
      getUsers(currentCompany.id),
      getClients(currentCompany.id),
      getSurveys(currentCompany.id),
    ]);

    const localClientsMap = new Map(allClients.map(c => [c.id, c]));
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

    const standardInterventions = relevantInterventions.filter(i => !i.isMaintenance && i.type === 'standard') as Intervention[];
    const newInstallations = relevantInterventions.filter(i => !i.isMaintenance && i.type === 'new_installation') as Intervention[];

    const openInterventions = relevantInterventions.filter(i => i.status === 'Nuovo' || i.status === 'In corso');
    const closedInterventions = relevantInterventions.filter(i => i.status === 'Completato' || i.status === 'Annullato' || i.status === 'Archiviato');
    
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
      operatorWorkload[op.name] = allInterventions.filter(i => i.assignedOperatorId === op.id && (i.status === 'Nuovo' || i.status === 'In corso')).length;
    });

    const operatorWorkloadData = Object.entries(operatorWorkload).map(([name, workload]) => ({ name, workload }));

    const highPriorityInterventions = relevantInterventions.filter(i => i.priority === 'Alta' || i.priority === 'Critica').slice(0, 3);
    
    const latestUpdates: EnrichedUpdate[] = relevantInterventions
      .flatMap(i => (i.updates || []).map(u => ({ 
          ...u, 
          interventionTitle: i.title,
          interventionId: i.id,
          clientName: localClientsMap.get(i.clientId)?.name || 'Cliente non trovato'
      })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
      
    const openInterventionsWithLocation = openInterventions
      .map(i => {
          const client = localClientsMap.get(i.clientId);
          return {
              id: i.id,
              title: i.title,
              clientName: client?.name || 'Sconosciuto',
              clientAddress: client?.address,
          };
      })
      .filter(i => i.clientAddress);

    const twoDaysFromNow = addDays(now, 2);
    const sevenDaysFromNow = addDays(now, 7);

    const dueSoonInterventions = standardInterventions.filter(i => 
        i.dueDate && new Date(i.dueDate) <= twoDaysFromNow && (i.status === 'Nuovo' || i.status === 'In corso')
    );

    const dueSoonNewInstallations = newInstallations.filter(i => 
        i.dueDate && new Date(i.dueDate) <= sevenDaysFromNow && (i.status === 'Nuovo' || i.status === 'In corso')
    );

    const openNewInstallations = newInstallations.filter(i => i.status === 'Nuovo' || i.status === 'In corso').length;
    const openSurveysList = allSurveys.filter(s => s.status === 'Pianificato');
    const openSurveys = openSurveysList.length;


    setKpiData({
      openInterventions: openInterventions.length,
      closedInterventions: closedInterventions.length,
      slaAdherencePercentage,
      overdueMaintenanceTasks,
      operatorWorkloadData,
      highPriorityInterventions,
      latestUpdates,
      allInterventions: relevantInterventions,
      dueSoonInterventions,
      dueSoonNewInstallations,
      openNewInstallations,
      openSurveys,
      openSurveysList,
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
  
    const handleClientUpdated = (updatedClient: User) => {
        setClients(prevClients => prevClients.map(c => c.id === updatedClient.id ? updatedClient : c));
    }


    const TaskItem = ({ task, icon }: { task: Intervention, icon: React.ReactNode }) => (
        <div 
            className="flex items-center gap-4 group cursor-pointer"
            onClick={(e) => {
                e.stopPropagation();
                openModal(task);
            }}
        >
          {icon}
          <div className="grid gap-1">
            <p className="text-sm font-medium leading-none group-hover:underline">{task.title}</p>
            <p className="text-sm text-muted-foreground">
              per {clientsMap.get(task.clientId)?.name || 'Sconosciuto'} - Scade {formatDistanceToNow(new Date(task.dueDate!), { addSuffix: true, locale: it })}
            </p>
          </div>
          <div className="ml-auto font-medium text-sm">{format(new Date(task.dueDate!), 'dd/MM')}</div>
        </div>
    );
    
    const SurveyTaskItem = ({ task }: { task: Survey }) => (
        <div 
            className="flex items-center gap-4 group cursor-pointer"
             onClick={(e) => {
                e.stopPropagation();
                router.push('/dashboard/surveys');
            }}
        >
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          <div className="grid gap-1">
            <p className="text-sm font-medium leading-none group-hover:underline">{task.title}</p>
            <p className="text-sm text-muted-foreground">
              per {clientsMap.get(task.clientId)?.name || 'Sconosciuto'}
            </p>
          </div>
          <div className="ml-auto font-medium text-sm">{format(new Date(task.date), 'dd/MM')}</div>
        </div>
    );


  return (
    <>
      <Header 
        title="Dashboard" 
        onInterventionAdded={fetchKpiData} 
        clients={clients} 
        operators={operators}
        />
      <ScrollArea className="flex-1">
        <main className="p-4 md:p-6 lg:p-8">
          {loading || !kpiData || !user ? (
            <div className="flex items-center justify-center flex-1 h-full">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          ) : (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                <div className="lg:col-span-6 flex flex-col gap-6 order-1 lg:order-1">
                    <ActivityFeed interventions={kpiData.allInterventions} latestUpdates={kpiData.latestUpdates} onUpdate={fetchKpiData} />
                    
                </div>
                
                <div className="lg:col-span-6 flex flex-col gap-6 order-3 lg:order-2">
                     <Card onClick={() => router.push('/dashboard/interventions')}>
                        <CardHeader>
                        <CardTitle className="font-headline">Interventi in Scadenza (48h)</CardTitle>
                        <CardDescription>
                            Interventi standard che richiedono attenzione immediata.
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-40">
                                <div className="grid gap-6 pr-6">
                                    {kpiData.dueSoonInterventions.length > 0 ? (
                                        kpiData.dueSoonInterventions.map(task => <TaskItem key={task.id} task={task} icon={<Wrench className="h-5 w-5 text-muted-foreground" />} />)
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">Nessun intervento in scadenza nelle prossime 48 ore.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card onClick={() => router.push('/dashboard/new-installations')}>
                        <CardHeader>
                            <CardTitle className="font-headline">Nuovi Impianti (7gg)</CardTitle>
                            <CardDescription>
                                Installazioni pianificate per la prossima settimana.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-40">
                                <div className="grid gap-6 pr-6">
                                    {kpiData.dueSoonNewInstallations.length > 0 ? (
                                        kpiData.dueSoonNewInstallations.map(task => <TaskItem key={task.id} task={task} icon={<HardHat className="h-5 w-5 text-muted-foreground" />} />)
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">Nessun nuovo impianto in programma per la prossima settimana.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    <Card onClick={() => router.push('/dashboard/surveys')}>
                        <CardHeader>
                            <CardTitle className="font-headline">Sopralluoghi da Fare</CardTitle>
                            <CardDescription>Sopralluoghi con stato "Pianificato".</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-40">
                                <div className="grid gap-6 pr-6">
                                    {kpiData.openSurveysList.length > 0 ? (
                                        kpiData.openSurveysList.map(task => <SurveyTaskItem key={task.id} task={task} />)
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">Nessun sopralluogo pianificato.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                 <div className="lg:col-span-12 grid gap-6 md:grid-cols-2 lg:grid-cols-5 order-4 lg:order-3">
                    <KpiCard
                        title="Adesione SLA"
                        value={`${kpiData.slaAdherencePercentage}%`}
                        icon={<Check className="h-4 w-4 text-muted-foreground" />}
                        description="Percentuale interventi nei tempi"
                    />
                    {user.role !== 'Client' && user.role !== 'Operator' && (
                        <KpiCard
                            title="Manutenzioni Scadute"
                            value={kpiData.overdueMaintenanceTasks}
                            icon={<AlertOctagon className="h-4 w-4 text-muted-foreground" />}
                            description="Attività di manutenzione in ritardo"
                            onClick={() => router.push('/dashboard/maintenance')}
                        />
                    )}
                    <KpiCard
                        title="Interventi Chiusi (30d)"
                        value={kpiData.closedInterventions}
                        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                        description="Completati nell'ultimo mese"
                    />
                    {user.role !== 'Client' && user.role !== 'Operator' && (
                        <KpiCard
                            title="Nuovi Impianti Aperti"
                            value={kpiData.openNewInstallations}
                            icon={<HardHat className="h-4 w-4 text-muted-foreground" />}
                            description="Installazioni da completare"
                            onClick={() => router.push('/dashboard/new-installations')}
                        />
                    )}
                     {user.role !== 'Client' && (
                        <KpiCard
                            title="Sopralluoghi Pianificati"
                            value={kpiData.openSurveys}
                            icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" />}
                            description="Sopralluoghi da eseguire"
                            onClick={() => router.push('/dashboard/surveys')}
                        />
                    )}
                </div>

                <div className="lg:col-span-12 order-2 lg:order-4">
                     <QuoteOfTheDay />
                </div>
            
                {user.role !== 'Client' && user.role !== 'Operator' && (
                    <Card className="lg:col-span-12 order-last">
                        <CardHeader>
                            <CardTitle className="font-headline">Carico Operatori</CardTitle>
                            <CardDescription>Numero di interventi aperti per operatore.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={kpiData.operatorWorkloadData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <Bar dataKey="workload" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
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
