
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/user-context';
import { Header } from '@/components/dashboard/header';
import { Loader, PlusCircle } from 'lucide-react';
import { SupportTicket } from '@/lib/types';
import { getSupportTickets } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { AddSupportTicketForm } from '@/components/dashboard/add-support-ticket-form';
import { SupportTicketsTable } from '@/components/dashboard/support-tickets-table';
import { SupportTicketConversation } from '@/components/dashboard/support-ticket-conversation';

export default function SupportPage() {
  const { user, currentCompany } = useUser();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const fetchData = async () => {
    if (!currentCompany) return;
    setIsLoading(true);
    const fetchedTickets = await getSupportTickets(currentCompany.id, user?.role === 'Client' ? user.id : undefined);
    setTickets(fetchedTickets);
    setIsLoading(false);
  };

  useEffect(() => {
    if (user && currentCompany) {
      fetchData();
    }
  }, [user, currentCompany]);

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
        onBack={() => setSelectedTicket(null)}
        onTicketUpdated={fetchData}
      />
    );
  }

  return (
    <>
      <Header title="Supporto Tecnico" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        {user.role === 'Client' && (
          <div className="flex justify-end">
            <AddSupportTicketForm onTicketAdded={fetchData}>
              <Button>
                <PlusCircle className="mr-2" />
                Apri un nuovo ticket
              </Button>
            </AddSupportTicketForm>
          </div>
        )}
        <SupportTicketsTable
          tickets={tickets}
          onTicketSelect={setSelectedTicket}
          currentUser={user}
          onTicketDeleted={fetchData}
        />
      </main>
    </>
  );
}
