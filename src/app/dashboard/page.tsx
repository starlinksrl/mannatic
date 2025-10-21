

'use client';

import { Header } from '@/components/dashboard/header';
import { getInterventions, getUsers, getClients, updateUser, getAppointments, getSupportTickets } from '@/lib/data';
import { Intervention, ScheduledMaintenance, User, InterventionUpdate, Appointment, SupportTicket } from '@/lib/types';
import { isAfter, addDays, startOfToday } from 'date-fns';
import { useUser } from '@/contexts/user-context';
import { useEffect, useState, useMemo } from 'react';
import { Loader, PlusCircle, Wrench, HardHat, Check, AlertOctagon, Clock, Activity, Settings, RefreshCw, ClipboardCheck, LifeBuoy, AlertTriangle, FilePlus, Hourglass } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Scratchpad } from '@/components/dashboard/scratchpad';
import { CompanyScratchpad } from '@/components/dashboard/company-scratchpad';


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
  openAppointments: number,
  openAppointmentsList: Appointment[],
  latestSupportTickets?: SupportTicket[],
  // Operator specific
  urgentOpenCount?: number;
  newCount?: number;
  inProgressCount?: number;
};


export default function DashboardPage() {
  const { user, setUser, currentCompany, setCurrentCompany } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<User[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const { intervention: interventionToEdit, isOpen, closeModal, openModal } = useInterventionModal();

  useEffect(() => {
    if (user?.role === 'Client') {
      router.replace('/dashboard/requests');
    }
  }, [user, router]);
  
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
    const [allInterventions, users, allClients, allAppointments, supportTickets] = await Promise.all([
      getInterventions(currentCompany.id),
      getUsers(currentCompany.id),
      getClients(currentCompany.id),
      getAppointments(currentCompany.id),
      user.role === 'Client' ? getSupportTickets(currentCompany.id, user.id) : 
      (user.role === 'Admin' || user.role === 'Creator') ? getSupportTickets(currentCompany.id) : Promise.resolve([]),
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
    const openAppointmentsList = allAppointments.filter(s => s.status === 'Pianificato');
    const openAppointments = openAppointmentsList.length;

    let latestSupportTickets: SupportTicket[] = [];
    if (user.role === 'Client') {
      latestSupportTickets = supportTickets.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0,3)
    } else if (user.role === 'Admin' || user.role === 'Creator') {
      latestSupportTickets = supportTickets
        .filter(t => t.status === 'Aperto')
        .sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0,3);
    }
    
    // Operator specific KPIs
    const urgentOpenCount = relevantInterventions.filter(i => (i.priority === 'Critica' || i.priority === 'Alta') && (i.status === 'Nuovo' || i.status === 'In corso')).length;
    const newCount = relevantInterventions.filter(i => i.status === 'Nuovo').length;
    const inProgressCount = relevantInterventions.filter(i => i.status === 'In corso').length;


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
      openAppointments,
      openAppointmentsList,
      latestSupportTickets,
      urgentOpenCount,
      newCount,
      inProgressCount,
    });
    setLoading(false);
  }

  useEffect(() => {
    if (user?.role === 'Creator' && !currentCompany) {
      router.replace('/dashboard/companies');
      return;
    }
    
    if (user && currentCompany && user.role !== 'Client') {
      fetchKpiData();
    } else if (!user || !currentCompany) {
        setLoading(false);
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

  if (user?.role === 'Client') {
    return (
        <div className="flex items-center justify-center flex-1 h-full">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
    );
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
    
    const AppointmentTaskItem = ({ task }: { task: Appointment }) => (
        <div 
            className="flex items-center gap-4 group cursor-pointer"
             onClick={(e) => {
                e.stopPropagation();
                router.push('/dashboard/appointments');
            }}
        >
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          <div className="grid gap-1">
            <p className="text-sm font-medium leading-none group-hover:underline">{task.title}</p>
            <p className="text-sm text-muted-foreground">
              per {clientsMap.get(task.clientId)?.name || 'Sconosciuto'}
            </p>
          </div>
          <div className="ml-auto font-medium text-sm">{format(new Date(task.date!), 'dd/MM')}</div>
        </div>
    );
    
    const SupportTicketItem = ({ ticket }: { ticket: SupportTicket }) => {
       const getStatusBadge = (status: 'Aperto' | 'Chiuso') => {
        switch (status) {
          case 'Aperto':
            return <Badge className="bg-green-100 text-green-800">Aperto</Badge>;
          case 'Chiuso':
            return <Badge variant="secondary">Chiuso</Badge>;
          default:
            return <Badge>{status}</Badge>;
        }
      };

      return (
        <div 
            className="flex items-center gap-4 group cursor-pointer"
             onClick={(e) => {
                e.stopPropagation();
                router.push('/dashboard/support');
            }}
        >
          <div className="flex-1 grid gap-1">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium leading-none group-hover:underline pr-2">{ticket.subject}</p>
              {getStatusBadge(ticket.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {user?.role !== 'Client' && `Per: ${ticket.clientName} - `}
              Ultimo agg.: {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true, locale: it })}
            </p>
          </div>
        </div>
      );
    }


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
          {loading || !kpiData || !user || !currentCompany ? (
            <div className="flex items-center justify-center flex-1 h-full">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          ) : (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {user.role === 'Operator' ? (
                   <div className="lg:col-span-12 grid gap-6 md:grid-cols-3 order-1">
                       <KpiCard
                            title="Interventi Aperti Urgenti"
                            value={kpiData.urgentOpenCount || 0}
                            icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                            description="Priorità Alta o Critica"
                            onClick={() => router.push('/dashboard/interventions?status=active&priority=Alta,Critica')}
                        />
                         <KpiCard
                            title="Interventi Nuovi"
                            value={kpiData.newCount || 0}
                            icon={<FilePlus className="h-4 w-4 text-muted-foreground" />}
                            description="In attesa di essere presi in carico"
                            onClick={() => router.push('/dashboard/interventions?status=Nuovo')}
                        />
                         <KpiCard
                            title="Interventi In Corso"
                            value={kpiData.inProgressCount || 0}
                            icon={<Hourglass className="h-4 w-4 text-muted-foreground" />}
                            description="Attualmente in lavorazione"
                            onClick={() => router.push('/dashboard/interventions?status=In corso')}
                        />
                   </div>
                ) : (
                    <>
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
                                title="Appuntamenti Pianificati"
                                value={kpiData.openAppointments}
                                icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" />}
                                description="Appuntamenti da eseguire"
                                onClick={() => router.push('/dashboard/appointments')}
                            />
                        )}
                    </div>
                     <div className="lg:col-span-6 flex flex-col gap-6 order-1 lg:order-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Scratchpad user={user} onUpdate={(updatedFields) => setUser(prev => prev ? {...prev, ...updatedFields} : null)} />
                            {user.role !== 'Operator' && <CompanyScratchpad user={user} company={currentCompany} onUpdate={(updatedFields) => setCurrentCompany(prev => prev ? {...prev, ...updatedFields} : null)} />}
                        </div>
                    </div>
                    </>
                )}
                
                <div className={cn("flex flex-col gap-6 order-3 lg:order-2", user.role === 'Operator' ? "lg:col-span-6" : "lg:col-span-6")}>
                    {(user.role === 'Client' || user.role === 'Admin' || user.role === 'Creator') && (
                       <Card onClick={() => router.push('/dashboard/support')}>
                          <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><LifeBuoy className="h-5 w-5"/> 
                                {user.role === 'Client' ? 'Le tue Richieste di Supporto' : 'Richieste di Supporto Aperte'}
                            </CardTitle>
                            <CardDescription>
                                Le 3 più recenti conversazioni con il supporto.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                              <ScrollArea className="h-40">
                                  <div className="grid gap-6 pr-6">
                                      {kpiData.latestSupportTickets && kpiData.latestSupportTickets.length > 0 ? (
                                          kpiData.latestSupportTickets.map(ticket => <SupportTicketItem key={ticket.id} ticket={ticket} />)
                                      ) : (
                                          <p className="text-sm text-muted-foreground text-center py-4">Nessun ticket di supporto trovato.</p>
                                      )}
                                  </div>
                              </ScrollArea>
                          </CardContent>
                      </Card>
                    )}
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
                </div>
                
                 <div className={cn("flex flex-col gap-6 order-2 lg:order-1", user.role === 'Operator' ? "lg:col-span-6" : "lg:col-span-6")}>
                    <ActivityFeed interventions={kpiData.allInterventions} latestUpdates={kpiData.latestUpdates} onUpdate={fetchKpiData} />
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
                    <Card onClick={() => router.push('/dashboard/appointments')}>
                        <CardHeader>
                            <CardTitle className="font-headline">Appuntamenti da Fare</CardTitle>
                            <CardDescription>Appuntamenti con stato "Pianificato".</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-40">
                                <div className="grid gap-6 pr-6">
                                    {kpiData.openAppointmentsList.length > 0 ? (
                                        kpiData.openAppointmentsList.map(task => <AppointmentTaskItem key={task.id} task={task} />)
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">Nessun appuntamento pianificato.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
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
       {!loading && currentCompany && <QuoteOfTheDay />}
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
