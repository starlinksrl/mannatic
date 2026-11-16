
'use client';

import { Header } from '@/components/dashboard/header';
import { InterventionsTable } from '@/components/dashboard/interventions-table';
import { getSupportTickets, getInterventions, getUsers, getClients } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User, Intervention, SupportTicket } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Loader, Mail, Phone, MapPin, ReceiptEuro, TrendingUp, ShieldCheck, ShieldOff, ScreenShare, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
        const sortedActiveTickets = [...activeTickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setSupportTickets(sortedActiveTickets);
        
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
        {/* Banner Teleassistenza Remota per Cliente */}
        <Card className="border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/40 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-blue-950/20 dark:border-blue-900/60 shadow-sm overflow-hidden">
          <CardContent className="p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm shrink-0">
                <ScreenShare className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                  Hai bisogno di Teleassistenza remota?
                  <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/40 text-xs">Rapido & Sicuro</Badge>
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Scarica il nostro modulo di supporto preconfigurato per consentire al nostro tecnico di intervenire a distanza sul tuo computer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 flex-wrap">
              <Button asChild className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <a href="/api/rustdesk/download?os=windows" download>
                  <Download className="h-4 w-4 mr-2" />
                  Scarica Teleassistenza (.exe)
                </a>
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto text-xs">
                <a href="/dashboard/remote-support">
                  Tutti i sistemi
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
            {clients.map(client => (
                <Card key={client.id}>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle>Informazioni di Contatto</CardTitle>
                            <Badge
                                variant={client.isSubscribed ? 'default' : 'secondary'}
                                className={
                                    client.isSubscribed
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-600 inline-flex items-center gap-1'
                                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 inline-flex items-center gap-1'
                                }
                            >
                                {client.isSubscribed ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                                Servizio Assistenza: {client.isSubscribed ? 'Abbonato' : 'Non Abbonato'}
                            </Badge>
                        </div>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle>Ticket di Supporto</CardTitle>
                        <CardDescription>Le tue richieste attive di assistenza tecnica o amministrativa.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/40" asChild>
                            <a href="/api/rustdesk/download?os=windows" download>
                                <ScreenShare className="mr-2 h-4 w-4" />
                                Scarica Teleassistenza
                            </a>
                        </Button>
                        <AddSupportTicketForm onTicketAdded={fetchData}>
                            <Button size="sm">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Apri Ticket
                            </Button>
                        </AddSupportTicketForm>
                    </div>
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
