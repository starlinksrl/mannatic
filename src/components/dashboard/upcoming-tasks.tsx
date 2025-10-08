
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Intervention, User } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Wrench, HardHat } from 'lucide-react';
import { useInterventionModal } from '@/contexts/intervention-modal-context';

interface UpcomingTasksProps {
  interventions: Intervention[];
  installations: Intervention[];
  clients: User[];
}

export function UpcomingTasks({ interventions, installations, clients }: UpcomingTasksProps) {
  const { openModal } = useInterventionModal();

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Cliente Sconosciuto';
  };

  const TaskItem = ({ task, icon }: { task: Intervention, icon: React.ReactNode }) => (
    <div 
        className="flex items-center gap-4 group cursor-pointer"
        onClick={() => openModal(task)}
    >
      {icon}
      <div className="grid gap-1">
        <p className="text-sm font-medium leading-none group-hover:underline">{task.title}</p>
        <p className="text-sm text-muted-foreground">
          per {getClientName(task.clientId)} - Scade {formatDistanceToNow(new Date(task.dueDate!), { addSuffix: true, locale: it })}
        </p>
      </div>
      <div className="ml-auto font-medium text-sm">{format(new Date(task.dueDate!), 'dd/MM')}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Interventi in Scadenza (48h)</CardTitle>
          <CardDescription>
            Interventi standard che richiedono attenzione immediata.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {interventions.length > 0 ? (
            interventions.map(task => <TaskItem key={task.id} task={task} icon={<Wrench className="h-5 w-5 text-muted-foreground" />} />)
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nessun intervento in scadenza nelle prossime 48 ore.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Nuovi Impianti (7gg)</CardTitle>
          <CardDescription>
            Installazioni pianificate per la prossima settimana.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {installations.length > 0 ? (
            installations.map(task => <TaskItem key={task.id} task={task} icon={<HardHat className="h-5 w-5 text-muted-foreground" />} />)
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nessun nuovo impianto in programma per la prossima settimana.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
