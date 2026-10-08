'use client';

import { useState, useEffect, Suspense } from 'react';
import { useUser } from '@/contexts/user-context';
import { Header } from '@/components/dashboard/header';
import { Loader, PlusCircle, Building, Search, X } from 'lucide-react';
import { Company, SupportTicket } from '@/lib/types';
import { getSupportTickets, getSupportTicketsForDistributor, getCompaniesByDistributorId } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddSupportTicketForm } from '@/components/dashboard/add-support-ticket-form';
import { SupportTicketsTable } from '@/components/dashboard/support-tickets-table';
import { SupportTicketConversation } from '@/components/dashboard/support-ticket-conversation';
import { useSearchParams } from 'next/navigation';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function SupportPageComponent() {
  const { user, currentCompany } = useUser();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updatedAt-desc');
  const [distributorCompanies, setDistributorCompanies] = useState<Company[]>([]);
  const [selectedCompanyForNewTicket, setSelectedCompanyForNewTicket] = useState<string>('');
  
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' | 'distributor'

  const isDistributor = user?.role === 'Distributor';
  const isDistributorAdmin = user?.role === 'DistributorAdmin';
  const isDistributorUser = user?.role === 'DistributorUser';
  const isDistributorFamily = isDistributor || isDistributorAdmin || isDistributorUser;
  const isAdmin = user?.role === 'Admin';
  const hasDistributor = !!currentCompany?.distributorId;

  // Resolve effective distributor ID for operators
  const effectiveDistributorId = isDistributor
    ? user?.id
    : (isDistributorAdmin || isDistributorUser) ? (user?.distributorId ?? null)
    : null;

  const fetchData = async (ticketToUpdateId?: string) => {
    if (!user) return;
    setIsLoading(true);

    let fetchedTickets: SupportTicket[] = [];

    if (isDistributorFamily && effectiveDistributorId) {
      // Fetch tickets across all distributor's companies (operators use parent distributorId)
      fetchedTickets = await getSupportTicketsForDistributor(effectiveDistributorId);
    } else if (currentCompany) {
      fetchedTickets = await getSupportTickets(
        currentCompany.id,
        user?.role === 'Client' ? user.id : undefined
      );
    }

    setTickets(fetchedTickets);

    let ticketToSelect = null;
    if (ticketToUpdateId) {
      ticketToSelect = fetchedTickets.find(t => t.id === ticketToUpdateId) || null;
    }
    setSelectedTicket(ticketToSelect);
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      const ticketIdFromUrl = searchParams.get('ticketId');
      fetchData(ticketIdFromUrl || undefined);
    }
  }, [user, currentCompany, searchParams]);

  // Load companies for distributor company selector
  useEffect(() => {
    if (isDistributorFamily && effectiveDistributorId) {
      getCompaniesByDistributorId(effectiveDistributorId).then(companies => {
        setDistributorCompanies(companies);
        if (companies.length > 0) setSelectedCompanyForNewTicket(companies[0].id);
      });
    }
  }, [isDistributorFamily, effectiveDistributorId]);

  const filteredTickets = tickets.filter(ticket => {
    // 1. Status Filter
    if (statusFilter === 'active') {
      if (ticket.status !== 'Aperto' && ticket.status !== 'In Lavorazione') return false;
    } else if (statusFilter !== 'all') {
      if (ticket.status !== statusFilter) return false;
    }

    // 2. Search Term Filter (subject or clientName)
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      const subjectMatch = ticket.subject?.toLowerCase().includes(query);
      const clientMatch = ticket.clientName?.toLowerCase().includes(query);
      if (!subjectMatch && !clientMatch) return false;
    }

    // 3. Company Filter (for Distributor family)
    if (isDistributorFamily && companyFilter !== 'all') {
      if (ticket.companyId !== companyFilter) return false;
    }

    // 4. Admin tabs routing (Client Support vs Distributor Support)
    if (isAdmin) {
      if (activeTab === 'clients') {
        return ticket.ticketType === 'client_support' || !ticket.ticketType;
      } else if (activeTab === 'distributor') {
        return ticket.ticketType === 'distributor_support';
      }
    }

    return true;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    switch (sortBy) {
      case 'updatedAt-desc':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'updatedAt-asc':
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case 'createdAt-desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'createdAt-asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'subject-asc':
        return (a.subject || '').localeCompare(b.subject || '');
      case 'subject-desc':
        return (b.subject || '').localeCompare(a.subject || '');
      case 'clientName-asc':
        return (a.clientName || '').localeCompare(b.clientName || '');
      case 'clientName-desc':
        return (b.clientName || '').localeCompare(a.clientName || '');
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  if (isLoading || !user) {
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
        onBack={() => fetchData()}
        onTicketUpdated={() => fetchData(selectedTicket.id)}
      />
    );
  }

  return (
    <>
      <Header title="Supporto Tecnico" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* Row 1: Tabs & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {isAdmin && hasDistributor && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                  <TabsTrigger value="clients">Ticket Clienti</TabsTrigger>
                  <TabsTrigger value="distributor">Ticket al Distributore</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Client: open ticket for their company */}
            {user.role === 'Client' && (
              <AddSupportTicketForm onTicketAdded={() => fetchData()}>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Apri un nuovo ticket
                </Button>
              </AddSupportTicketForm>
            )}

            {/* Admin: open ticket for their Distributor (only if viewing that tab) */}
            {isAdmin && hasDistributor && activeTab === 'distributor' && (
              <AddSupportTicketForm 
                onTicketAdded={() => fetchData()}
                ticketType="distributor_support"
              >
                <Button>
                  <Building className="mr-2 h-4 w-4" />
                  Richiedi Assistenza Distributore
                </Button>
              </AddSupportTicketForm>
            )}

            {/* Distributor family: company selector + new ticket (DistributorUser is read-only) */}
            {isDistributorFamily && distributorCompanies.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">Nuovo ticket per:</span>
                <Select value={selectedCompanyForNewTicket} onValueChange={setSelectedCompanyForNewTicket}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleziona installatore" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributorCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isDistributorUser && (
                  <AddSupportTicketForm
                    onTicketAdded={() => fetchData()}
                    overrideCompanyId={selectedCompanyForNewTicket}
                    ticketType="distributor_support"
                  >
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Apri Ticket
                    </Button>
                  </AddSupportTicketForm>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Search & Filters Bar */}
        <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl border bg-card/50 backdrop-blur shadow-sm">
          {/* Cerca */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <span className="text-xs text-muted-foreground font-medium">Cerca ticket</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8"
                placeholder="Cerca per oggetto o cliente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Filtra per Stato */}
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <span className="text-xs text-muted-foreground font-medium">Stato</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Attivi (Aperti/In Lav.)</SelectItem>
                <SelectItem value="Aperto">Solo Aperti</SelectItem>
                <SelectItem value="In Lavorazione">Solo In Lavorazione</SelectItem>
                <SelectItem value="Chiuso">Solo Chiusi</SelectItem>
                <SelectItem value="all">Tutti</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtra per Installatore (solo per Distributore) */}
          {isDistributorFamily && distributorCompanies.length > 0 && (
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <span className="text-xs text-muted-foreground font-medium">Filtra per Installatore</span>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti gli installatori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli installatori</SelectItem>
                  {distributorCompanies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Ordina per */}
          <div className="flex flex-col gap-1.5 min-w-[180px]">
            <span className="text-xs text-muted-foreground font-medium">Ordina per</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Ordina per" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt-desc">Ultimo aggiornamento (Nuovi)</SelectItem>
                <SelectItem value="updatedAt-asc">Ultimo aggiornamento (Vecchi)</SelectItem>
                <SelectItem value="createdAt-desc">Data creazione (Nuovi)</SelectItem>
                <SelectItem value="createdAt-asc">Data creazione (Vecchi)</SelectItem>
                <SelectItem value="subject-asc">Oggetto (A-Z)</SelectItem>
                <SelectItem value="subject-desc">Oggetto (Z-A)</SelectItem>
                {(user.role === 'Admin' || user.role === 'Distributor') && (
                  <>
                    <SelectItem value="clientName-asc">Cliente (A-Z)</SelectItem>
                    <SelectItem value="clientName-desc">Cliente (Z-A)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Rimuovi filtri */}
          {(searchTerm || statusFilter !== 'active' || companyFilter !== 'all' || sortBy !== 'updatedAt-desc') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('active');
                setCompanyFilter('all');
                setSortBy('updatedAt-desc');
              }}
              title="Rimuovi filtri"
              className="h-10 w-10 border border-dashed text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isDistributorFamily && (
          <p className="text-sm text-muted-foreground">
            Stai visualizzando i ticket di tutte le installatori gestite ({distributorCompanies.length} aziende).
          </p>
        )}

        <SupportTicketsTable
          tickets={sortedTickets}
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
  );
}
