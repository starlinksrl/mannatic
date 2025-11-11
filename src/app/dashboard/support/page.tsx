

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useUser } from '@/contexts/user-context';
import { Header } from '@/components/dashboard/header';
import { Loader, PlusCircle } from 'lucide-react';
import { SupportTicket } from '@/lib/types';
import { getSupportTickets } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { AddSupportTicketForm } from '@/components/dashboard/add-support-ticket-form';
import { SupportTicketsTable } from '@/components/dashboard/support-tickets-table';
import { SupportTicketConversation } from '@/components/dashboard/support-ticket-conversation';
import { useSearchParams } from 'next/navigation';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

function SupportPageComponent() {
  const { user, currentCompany } = useUser();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState('Aperto');

  const fetchData = async (ticketToUpdateId?: string) => {
    if (!currentCompany || !user) return;
    setIsLoading(true);
    const fetchedTickets = await getSupportTickets(currentCompany.id, user?.role === 'Client' ? user.id : undefined);
    setTickets(fetchedTickets);
    
    let ticketToSelect = null;
    if (ticketToUpdateId) {
        ticketToSelect = fetchedTickets.find(t => t.id === ticketToUpdateId);
    }
    
    if (ticketToSelect) {
        setSelectedTicket(ticketToSelect);
    } else {
        setSelectedTicket(null); // Explicitly set to null if no ticket is found or needed
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (user && currentCompany) {
      const ticketIdFromUrl = searchParams.get('ticketId');
      fetchData(ticketIdFromUrl || undefined);
    }
  }, [user, currentCompany, searchParams]);

  const filteredTickets = tickets.filter(ticket => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'Aperto') return ticket.status === 'Aperto' || ticket.status === 'In Lavorazione';
    return ticket.status === statusFilter;
  });

  if (isLoading || !user || !currentCompany) {
    return (
      <>
        <Header title="Supporto" />
        <div className="flex flex-1 items-center justify-center">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  if (selectedTicket) {
    return (
      <SupportTicketConversation
        ticket={selectedTicket}
        onBack={() => fetchData()} // Refetch all tickets when going back
        onTicketUpdated={() => fetchData(selectedTicket.id)}
      />
    );
  }

  return (
    <>
      <Header title="Supporto Tecnico" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex justify-between items-center">
             <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Aperto">Aperti</SelectItem>
                    <SelectItem value="Chiuso">Chiusi</SelectItem>
                    <SelectItem value="all">Tutti</SelectItem>
                </SelectContent>
            </Select>
            {user.role === 'Client' && (
                <AddSupportTicketForm onTicketAdded={() => fetchData()}>
                <Button>
                    <PlusCircle className="mr-2" />
                    Apri un nuovo ticket
                </Button>
                </AddSupportTicketForm>
            )}
        </div>
        <SupportTicketsTable
          tickets={filteredTickets}
          onTicketSelect={setSelectedTicket}
          currentUser={user}
          onTicketDeleted={() => fetchData()}
        />
      </main>
    </>
  );
}

export default function SupportPage() {
    return (
        <Suspense fallback={
            <>
                <Header title="Supporto" />
                <div className="flex flex-1 items-center justify-center">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        }>
            <SupportPageComponent />
        </Suspense>
    )
}
