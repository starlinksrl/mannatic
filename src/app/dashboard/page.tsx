

'use client';

import { Header } from '@/components/dashboard/header';
import { getInterventions, getUsers, getClients, updateUser, getAppointments, getSupportTickets } from '@/lib/data';
import { Intervention, ScheduledMaintenance, User, InterventionUpdate, Appointment, SupportTicket } from '@/lib/types';
import { isAfter, addDays, startOfToday, isWithinInterval, startOfDay } from 'date-fns';
import { useUser } from '@/contexts/user-context';
import { useEffect, useState, useMemo } from 'react';
import { Loader, PlusCircle, Wrench, HardHat, Check, AlertOctagon, Clock, Activity, Settings, RefreshCw, ClipboardCheck, LifeBuoy, AlertTriangle, FilePlus, Hourglass, UserCheck } from 'lucide-react';
import { GenerateKpiDashboardInput } from '@/ai/flows/generate-kpi-dashboard';
import { Building } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { InterventionsTable } from '@/components/dashboard/interventions-table';
import { EditAppointmentForm } from '@/components/dashboard/edit-appointment-form';


export type EnrichedUpdate = InterventionUpdate & { 
  interventionTitle: string; 
  interventionId: string;
  clientName: string;
};

type WeeklyScheduleItem = (Intervention | Appointment) & { itemType: 'intervention' | 'appointment' };

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
  assignedCount?: number;
  weeklySchedule: WeeklyScheduleItem[];
};


export default function DashboardPage() {
  const { user, setUser, currentCompany, setCurrentCompany } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<User[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const { intervention: interventionToEdit, isOpen, closeModal, openModal } = useInterventionModal();
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);


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
    
    let relevantInterventionsForKpis: (Intervention | ScheduledMaintenance)[];
    
    if (user.role === 'Operator') {
        const operatorInterventions = allInterventions.filter(i => i.assignedOperatorId === user.id);
        const unassignedInterventions = allInterventions.filter(i => !i.assignedOperatorId);
        relevantInterventionsForKpis = [...operatorInterventions, ...unassignedInterventions];
    } else {
        relevantInterventionsForKpis = allInterventions;
    }
    
    const activeInterventions = allInterventions.filter(i => ['Nuovo', 'In corso'].includes(i.status));

    const openInterventions = activeInterventions.length;
    const closedInterventions = allInterventions.filter(i => i.status === 'Completato' || i.status === 'Annullato' || i.status === 'Archiviato');
    
    const totalClosedOrInProgress = allInterventions.filter(i => i.status === 'Completato' || i.status === 'In corso');
    const onTime = totalClosedOrInProgress.filter(i => {
      if(i.completedAt) {
        return !isAfter(new Date(i.completedAt), new Date(i.dueDate!));
      }
      return !isAfter(now, new Date(i.dueDate!));
    });
    const slaAdherencePercentage = totalClosedOrInProgress.length > 0 ? Math.round((onTime.length / totalClosedOrInProgress.length) * 100) : 100;

    const overdueMaintenanceTasks = allInterventions.filter(i => {
      const isMaintenance = 'periodicity' in i;
      return isMaintenance && (i.status === 'Nuovo' || i.status === 'In corso') && isAfter(now, new Date(i.dueDate!));
    }).length;
    
    const operatorWorkload: Record<string, number> = {};
    users.filter(u => u.role === 'Operator').forEach(op => {
      operatorWorkload[op.name] = allInterventions.filter(i => i.assignedOperatorId === op.id && (i.status === 'Nuovo' || i.status === 'In corso')).length;
    });

    const operatorWorkloadData = Object.entries(operatorWorkload).map(([name, workload]) => ({ name, workload }));

    const highPriorityInterventions = allInterventions.filter(i => i.priority === 'Alta' || i.priority === 'Critica').slice(0, 3);
    
    const latestUpdates: EnrichedUpdate[] = allInterventions
      .flatMap(i => (i.updates || []).map(u => ({ 
          ...u, 
          interventionTitle: i.title,
          interventionId: i.id,
          clientName: localClientsMap.get(i.clientId)?.name || 'Cliente non trovato'
      })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
      
    const openInterventionsWithLocation = activeInterventions
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
    const sevenDaysFromNow = addDays(startOfToday(), 7);

    const standardInterventions = allInterventions.filter(i => !i.isMaintenance && i.type === 'standard') as Intervention[];
    const newInstallations = allInterventions.filter(i => !i.isMaintenance && i.type === 'new_installation') as Intervention[];

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
    
    // KPIs for the summary box
    const allActiveInterventions = allInterventions.filter(i => ['Nuovo', 'In corso'].includes(i.status));
    const urgentOpenCount = allActiveInterventions.filter(i => i.type !== 'new_installation' && (i.priority === 'Critica' || i.priority === 'Alta')).length;
    const newCount = allActiveInterventions.filter(i => i.type !== 'new_installation' && i.status === 'Nuovo').length;
    const inProgressCount = allActiveInterventions.filter(i => i.type !== 'new_installation' && i.status === 'In corso').length;
    
    let assignedCount: number;
    if (user.role === 'Operator') {
        assignedCount = allInterventions.filter(i => i.assignedOperatorId === user.id && ['Nuovo', 'In corso'].includes(i.status)).length;
    } else {
        assignedCount = allInterventions.filter(i => !!i.assignedOperatorId && ['Nuovo', 'In corso'].includes(i.status)).length;
    }
    
    const scheduleStartDate = startOfToday();
    const scheduleEndDate = addDays(scheduleStartDate, 7);

    const operatorAllowedSectors = user.role === 'Operator' ? user.allowedSectors || [] : null;

    let scheduledInterventions: WeeklyScheduleItem[] = allInterventions
      .filter(i => 
        i.dueDate && 
        isWithinInterval(new Date(i.dueDate), { start: scheduleStartDate, end: scheduleEndDate }) &&
        (i.status === 'Nuovo' || i.status === 'In corso')
      )
      .map(i => ({ ...i, itemType: 'intervention' }));

    let scheduledAppointments: WeeklyScheduleItem[] = allAppointments
      .filter(a => 
        a.date && 
        isWithinInterval(new Date(a.date), { start: scheduleStartDate, end: scheduleEndDate }) &&
        a.status === 'Pianificato'
      )
      .map(a => ({ ...a, itemType: 'appointment' }));
      
    if (operatorAllowedSectors) {
        scheduledInterventions = scheduledInterventions.filter(item => {
            const intervention = item as Intervention;
            if (intervention.isMaintenance) {
                return operatorAllowedSectors.includes('maintenance');
            }
            if (intervention.type === 'new_installation') {
                return operatorAllowedSectors.includes('new_installations');
            }
            return operatorAllowedSectors.includes('interventions');
        });
        
        scheduledAppointments = scheduledAppointments.filter(() => operatorAllowedSectors.includes('appointments'));
    }

    const weeklySchedule = [...scheduledInterventions, ...scheduledAppointments]
      .sort((a, b) => new Date(a.itemType === 'intervention' ? a.dueDate! : a.date!).getTime() - new Date(b.itemType === 'intervention' ? b.dueDate! : b.date!).getTime());



    setKpiData({
      openInterventions,
      closedInterventions: closedInterventions.length,
      slaAdherencePercentage,
      overdueMaintenanceTasks,
      operatorWorkloadData,
      highPriorityInterventions,
      latestUpdates,
      allInterventions: allInterventions,
      dueSoonInterventions,
      dueSoonNewInstallations,
      openNewInstallations,
      openAppointments,
      openAppointmentsList,
      latestSupportTickets,
      urgentOpenCount,
      newCount,
      inProgressCount,
      assignedCount,
      weeklySchedule,
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
                router.push('/dashboard/support?ticketId=${ticket.id}');
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
    
    const WeeklyScheduleCard = ({ schedule }: { schedule: WeeklyScheduleItem[] }) => {
      const groupedSchedule = schedule.reduce((acc, item) => {
        const date = format(new Date(item.itemType === 'intervention' ? item.dueDate! : item.date!), 'yyyy-MM-dd');
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(item);
        return acc;
      }, {} as Record<string, WeeklyScheduleItem[]>);

      return (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Programmazione Settimanale</CardTitle>
            <CardDescription>Attività pianificate per i prossimi 7 giorni.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-4 pr-4">
                {Object.keys(groupedSchedule).length > 0 ? (
                  Object.entries(groupedSchedule).map(([date, items]) => (
                    <div key={date}>
                      <h4 className="font-semibold text-sm mb-2 sticky top-0 bg-background py-1">
                        {format(new Date(date), 'eeee, dd MMMM', { locale: it })}
                      </h4>
                      <div className="space-y-3 pl-2 border-l-2">
                        {items.map(item => {
                          const clientName = clientsMap.get(item.clientId)?.name || 'N/D';
                          const time = format(new Date(item.itemType === 'intervention' ? item.dueDate! : item.date!), 'HH:mm');
                          const icon = item.itemType === 'intervention' 
                            ? ((item as Intervention).type === 'new_installation' ? <HardHat className="h-5 w-5 text-blue-500" /> : <Wrench className="h-5 w-5 text-orange-500" />)
                            : <ClipboardCheck className="h-5 w-5 text-purple-500" />;

                           const handleClick = () => {
                            if (item.itemType === 'intervention') {
                                openModal(item as Intervention);
                            } else {
                                setAppointmentToEdit(item as Appointment);
                                setIsAppointmentModalOpen(true);
                            }
                           };

                          return (
                            <div key={item.id} className="flex items-start gap-3 cursor-pointer group" onClick={handleClick}>
                              <div className="flex-shrink-0 pt-1">{icon}</div>
                              <div className="flex-1">
                                <p className="text-sm font-medium group-hover:underline">{item.title}</p>
                                <p className="text-xs text-muted-foreground">{clientName}</p>
                              </div>
                              <p className="text-sm font-mono">{time}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Nessuna attività programmata per i prossimi 7 giorni.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      );
    };


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

                {(user.role === 'Admin' || user.role === 'Operator') && (
                  <Card className="lg:col-span-12 order-1">
                    <CardHeader>
                        <CardTitle className="font-headline">Riepilogo Attività</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                       <KpiCard
                            title="Interventi Urgenti"
                            value={kpiData.urgentOpenCount || 0}
                            icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
                            onClick={() => router.push('/dashboard/interventions?status=active&priority=Alta,Critica')}
                            isLoading={loading}
                        />
                        <KpiCard
                            title="Interventi Nuovi"
                            value={kpiData.newCount || 0}
                            icon={<FilePlus className="h-6 w-6 text-blue-500" />}
                            onClick={() => router.push('/dashboard/interventions?status=Nuovo')}
                            isLoading={loading}
                        />
                        <KpiCard
                            title="Interventi in Corso"
                            value={kpiData.inProgressCount || 0}
                            icon={<Hourglass className="h-6 w-6 text-yellow-500" />}
                            onClick={() => router.push('/dashboard/interventions?status=In corso')}
                            isLoading={loading}
                        />
                         <KpiCard
                            title="Interventi Assegnati"
                            value={kpiData.assignedCount || 0}
                            icon={<UserCheck className="h-6 w-6 text-green-500" />}
                           onClick={() => {
                                if (user.role === 'Operator') {
                                    router.push(`/dashboard/interventions?status=active&operator=${user.id}`);
                                } else {
                                    router.push('/dashboard/interventions?status=active&assigned=true');
                                }
                            }}
                            isLoading={loading}
                        />
                        <KpiCard
                            title="Nuovi Impianti Aperti"
                            value={kpiData.openNewInstallations || 0}
                            icon={<HardHat className="h-6 w-6 text-gray-500" />}
                            onClick={() => router.push('/dashboard/new-installations')}
                            isLoading={loading}
                        />
                    </CardContent>
                  </Card>
                )}
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12 lg:col-span-12 order-2">
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <Scratchpad user={user} onUpdate={(updatedFields) => setUser(prev => prev ? {...prev, ...updatedFields} : null)} />
                        <CompanyScratchpad user={user} company={currentCompany} onUpdate={(updatedFields) => setCurrentCompany(prev => prev ? {...prev, ...updatedFields} : null)} />
                    </div>

                    <div className="lg:col-span-8 flex flex-col gap-6">
                         <WeeklyScheduleCard schedule={kpiData.weeklySchedule} />
                    </div>
                </div>

                <div className="lg:col-span-12 order-3">
                   <InterventionsTable 
                        interventions={user.role === 'Operator' ? kpiData.allInterventions.filter(i => i.assignedOperatorId === user.id) as Intervention[] : kpiData.allInterventions as Intervention[]} 
                        currentUser={user} 
                        clients={clients} 
                        operators={operators}
                        onInterventionChange={fetchKpiData}
                        initialStatusFilter={searchParams.get('status') || 'active'}
                        initialPriorityFilter={searchParams.get('priority') || 'all'}
                    />
                </div>
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
       <EditAppointmentForm
        appointment={appointmentToEdit}
        onAppointmentUpdated={() => {
            fetchKpiData();
            setIsAppointmentModalOpen(false);
            setAppointmentToEdit(null);
        }}
        clients={clients}
        operators={operators}
        isOpen={isAppointmentModalOpen}
        setIsOpen={(open) => {
            setIsAppointmentModalOpen(open);
            if (!open) {
                setAppointmentToEdit(null);
            }
        }}
      />
    </>
  );
}



