
'use client';

import { Header } from '@/components/dashboard/header';
import { InterventionsTable } from '@/components/dashboard/interventions-table';
import { getSupportTickets, getInterventions, getUsers, getClients } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User, Intervention, SupportTicket } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Loader, Mail, Phone, MapPin, ReceiptEuro, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SupportTicketsTable } from '@/components/dashboard/support-tickets-table';
import { AddSupportTicketForm } from '@/components/dashboard/add-support-ticket-form';
import { PlusCircle } from 'lucide-react';


export default function ClientRequestsPage() {
    const { user, currentCompany } = useUser();
    const router = useRouter();
    const [operators, setOperators] = useState<User[]>([]);
    const [clients, setClients] = useState<User[]>([]);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user || !currentCompany) return;
        setLoading(true);
        
        if (user.role !== 'Client') {
          setLoading(false);
          router.push('/dashboard');
          return;
        }

        const [allUsers, allClients, allInterventions, allTickets] = await Promise.all([
            getUsers(currentCompany.id),
            getClients(currentCompany.id),
            getInterventions(currentCompany.id),
            getSupportTickets(currentCompany.id, user.id)
        ]);

        setOperators(allUsers.filter(u => u.role === 'Operator'));
        setClients(allClients.filter(c => c.id === user.id));
        setInterventions(allInterventions.filter(i => i.clientId === user.id) as Intervention[]);
        
        // Filtra solo i ticket aperti o in lavorazione per la dashboard
        const activeTickets = allTickets.filter(t => t.status === 'Aperto' || t.status === 'In Lavorazione');
        setSupportTickets(activeTickets);
        
        setLoading(false);
    }

    useEffect(() => {
        fetchData();
    }, [user, currentCompany]);
    
    const totalToInvoice = useMemo(() => {
        return interventions
            .filter(i => i.status === 'Da Fatturare')
            .reduce((acc, i) => acc + (i.cost || 0), 0);
    }, [interventions]);

    if (user?.role !== 'Client') {
      return null;
    }


    if (!user || loading) {
        return (
            <>
                <Header title="Le mie Richieste" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }
    
    const handleTicketSelect = (ticket: SupportTicket) => {
        router.push(`/dashboard/support?ticketId=${ticket.id}`);
    }

  return (
    <>
      <Header title="Le mie Richieste" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
            {clients.map(client => (
                <Card key={client.id}>
                    <CardHeader>
                        <CardTitle>Informazioni di Contatto</CardTitle>
                        <CardDescription>Dettagli per {client.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {client.address && (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                                <MapPin className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"/>
                                <div>
                                    <p className="font-medium group-hover:text-primary transition-colors">{client.address}</p>
                                    <p className="text-sm text-muted-foreground">Clicca per aprire la mappa</p>
                                </div>
                            </a>
                        )}
                        {client.phone && (
                            <a href={`tel:${client.phone}`} className="flex items-center gap-3 group">
                                <Phone className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"/>
                                <div>
                                    <p className="font-medium group-hover:text-primary transition-colors">{client.phone}</p>
                                    <p className="text-sm text-muted-foreground">Clicca per chiamare</p>
                                </div>
                            </a>
                        )}
                    </CardContent>
                </Card>
            ))}

            {totalToInvoice > 0 && (
                <Card className="border-purple-200 bg-purple-50/30 dark:bg-purple-900/10 dark:border-purple-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                            <ReceiptEuro className="h-5 w-5" />
                            Riepilogo Lavori Terminati
                        </CardTitle>
                        <CardDescription>Importi relativi agli interventi pronti per la fatturazione.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-full">
                                <TrendingUp className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-purple-600 font-bold uppercase tracking-tight">Totale da Fatturare</p>
                                <p className="text-3xl font-black text-purple-800 dark:text-purple-300">
                                    € {totalToInvoice.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
        
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Ticket di Supporto</CardTitle>
                        <CardDescription>Le tue richieste attive di assistenza tecnica o amministrativa.</CardDescription>
                    </div>
                    <AddSupportTicketForm onTicketAdded={fetchData}>
                        <Button size="sm">
                            <PlusCircle className="mr-2" />
                            Apri Ticket
                        </Button>
                    </AddSupportTicketForm>
                </div>
            </CardHeader>
            <CardContent>
                 <SupportTicketsTable
                    tickets={supportTickets}
                    onTicketSelect={handleTicketSelect}
                    currentUser={user}
                    onTicketDeleted={fetchData}
                    isDashboardView={true}
                />
                {supportTickets.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                        Non hai ticket di supporto attivi al momento.
                    </p>
                )}
            </CardContent>
        </Card>

        <Separator />
      
        <InterventionsTable 
            interventions={interventions} 
            currentUser={user} 
            clients={clients} 
            operators={operators}
            onInterventionChange={fetchData}
        />
      </main>
    </>
  );
}
