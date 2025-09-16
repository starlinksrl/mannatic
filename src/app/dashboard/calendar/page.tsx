
'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { interventions } from '@/lib/data';
import { Intervention } from '@/lib/types';
import { format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { getClient, getOperator } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role === 'Client') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user) return null;


  const roleBasedInterventions = interventions.filter(i => {
    if (user.role === 'Admin') return true;
    if (user.role === 'Operator') return i.assignedOperatorId === user.id;
    return false;
  });

  const selectedDayInterventions = roleBasedInterventions.filter(i => 
    date && isSameDay(new Date(i.dueDate), date)
  );
  
  const getStatusBadge = (status: Intervention['status']) => {
    switch (status) {
      case 'Nuovo': return <Badge variant="outline">Nuovo</Badge>;
      case 'In corso': return <Badge className="bg-blue-100 text-blue-800">In corso</Badge>;
      case 'In attesa': return <Badge className="bg-yellow-100 text-yellow-800">In attesa</Badge>;
      case 'Completato': return <Badge className="bg-green-100 text-green-800">Completato</Badge>;
      case 'Annullato': return <Badge variant="destructive">Annullato</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: Intervention['priority']) => {
    switch (priority) {
      case 'Critica': return <Badge variant="destructive">Critica</Badge>;
      case 'Alta': return <Badge className="bg-orange-500 text-white">Alta</Badge>;
      case 'Media': return <Badge className="bg-yellow-500 text-white">Media</Badge>;
      case 'Bassa': return <Badge variant="secondary">Bassa</Badge>;
    }
  };

  if (user.role === 'Client') {
    return null; 
  }

  return (
    <>
      <Header title="Calendario" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
             <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="w-full"
                locale={it}
                modifiers={{
                  hasIntervention: interventions.map(i => new Date(i.dueDate))
                }}
                modifiersStyles={{
                  hasIntervention: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                  }
                }}
              />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>
                    {date ? format(date, 'eeee, dd MMMM yyyy', {locale: it}) : 'Seleziona una data'}
                </CardTitle>
                <CardDescription>
                    {selectedDayInterventions.length > 0 
                        ? `${selectedDayInterventions.length} intervent${selectedDayInterventions.length === 1 ? 'o' : 'i'} in programma`
                        : 'Nessun intervento in programma'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {selectedDayInterventions.map(intervention => {
                         const client = getClient(intervention.clientId);
                         const operator = intervention.assignedOperatorId ? getOperator(intervention.assignedOperatorId) : null;
                        return (
                            <div key={intervention.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <p className="font-semibold">{intervention.title}</p>
                                        <p className="text-sm text-muted-foreground">{client?.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getPriorityBadge(intervention.priority)}
                                        {getStatusBadge(intervention.status)}
                                    </div>
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                    <p>Operatore: {operator?.name || 'Non assegnato'}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>

      </main>
    </>
  );
}
