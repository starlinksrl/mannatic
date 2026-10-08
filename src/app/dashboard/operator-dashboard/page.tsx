'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { getSupportTicketsForDistributor, getQuotesForDistributor, getCompaniesByDistributorId } from '@/lib/data';
import { SupportTicket, DistributorQuote, Company } from '@/lib/types';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Loader, LifeBuoy, FileText, Building, TicketCheck, Clock,
  AlertTriangle, CheckCircle2, ArrowRight, CalendarClock, Package, Users
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function KpiCard({
  title,
  value,
  icon,
  color,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
      )}
      onClick={onClick}
    >
      <div className={cn('absolute inset-0 opacity-5', color)} />
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn('p-3 rounded-xl', color, 'text-white')}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TicketStatusBadge({ status }: { status: SupportTicket['status'] }) {
  const map: Record<string, { label: string; className: string }> = {
    Aperto: { label: 'Aperto', className: 'bg-red-100 text-red-700 border-red-200' },
    'In Lavorazione': { label: 'In Lavorazione', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    Chiuso: { label: 'Chiuso', className: 'bg-green-100 text-green-700 border-green-200' },
  };
  const s = map[status] ?? { label: status, className: '' };
  return <Badge className={cn('text-xs', s.className)}>{s.label}</Badge>;
}

export default function DistributorOperatorDashboard() {
  const { user } = useUser();
  const router = useRouter();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [quotes, setQuotes] = useState<DistributorQuote[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const isDistributor = user?.role === 'Distributor';
  const isDistributorOp = user?.role === 'DistributorAdmin' || user?.role === 'DistributorUser';
  const effectiveDistributorId = isDistributor ? user?.id : user?.distributorId;

  useEffect(() => {
    if (!user) return;
    // Only DistributorAdmin and DistributorUser land here
    if (!isDistributorOp) {
      router.replace('/dashboard');
      return;
    }
    if (!effectiveDistributorId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const [t, q, c] = await Promise.all([
        getSupportTicketsForDistributor(effectiveDistributorId),
        getQuotesForDistributor(effectiveDistributorId),
        getCompaniesByDistributorId(effectiveDistributorId),
      ]);
      setTickets(t);
      setQuotes(q);
      setCompanies(c);
      setLoading(false);
    };

    load();
  }, [user, effectiveDistributorId]);

  if (!user || loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const openTickets = tickets.filter(t => t.status === 'Aperto');
  const inProgressTickets = tickets.filter(t => t.status === 'In Lavorazione');
  const closedTickets = tickets.filter(t => t.status === 'Chiuso');
  const recentQuotes = quotes.slice(0, 5);

  // Tickets sorted: open first, then in progress, then by date
  const sortedOpenTickets = [...openTickets, ...inProgressTickets].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <>
      <Header title="Dashboard Operatore" />
      <ScrollArea className="flex-1">
        <main className="p-4 md:p-6 lg:p-8 space-y-6">

          {/* Welcome banner */}
          <div className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Benvenuto, {user.name}!</h2>
                <p className="text-teal-100 text-sm mt-1">
                  {user.role === 'DistributorAdmin'
                    ? 'Accesso Admin — puoi gestire ticket, preventivi e operatori.'
                    : 'Accesso Operatore — puoi gestire ticket e preventivi.'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm bg-white/20 rounded-lg px-4 py-2">
                <CalendarClock className="h-4 w-4" />
                <span>{format(new Date(), "EEEE d MMMM yyyy", { locale: it })}</span>
              </div>
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Ticket Aperti"
              value={openTickets.length}
              icon={<AlertTriangle className="h-5 w-5" />}
              color="bg-red-500"
              onClick={() => router.push('/dashboard/support')}
            />
            <KpiCard
              title="In Lavorazione"
              value={inProgressTickets.length}
              icon={<Clock className="h-5 w-5" />}
              color="bg-yellow-500"
              onClick={() => router.push('/dashboard/support')}
            />
            <KpiCard
              title="Preventivi Totali"
              value={quotes.length}
              icon={<FileText className="h-5 w-5" />}
              color="bg-blue-500"
              onClick={() => router.push('/dashboard/quotes')}
            />
            <KpiCard
              title="Installatori"
              value={companies.length}
              icon={<Building className="h-5 w-5" />}
              color="bg-violet-500"
            />
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Open Tickets — wide */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <LifeBuoy className="h-5 w-5 text-red-500" />
                    Ticket Aperti
                  </CardTitle>
                  <CardDescription>
                    {sortedOpenTickets.length > 0
                      ? `${sortedOpenTickets.length} ticket da gestire`
                      : 'Nessun ticket aperto'}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/support')}>
                  Vedi tutti <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  {sortedOpenTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                      <CheckCircle2 className="h-10 w-10 mb-2 text-green-400" />
                      <p className="text-sm">Tutto in ordine — nessun ticket aperto!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pr-2">
                      {sortedOpenTickets.map(ticket => (
                        <div
                          key={ticket.id}
                          onClick={() => router.push(`/dashboard/support?id=${ticket.id}`)}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors group"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <TicketCheck className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold line-clamp-1 group-hover:underline">
                                {ticket.subject}
                              </p>
                              <TicketStatusBadge status={ticket.status} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {ticket.clientName}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(parseISO(ticket.updatedAt), { addSuffix: true, locale: it })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right column */}
            <div className="flex flex-col gap-6">

              {/* Recent Quotes */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-headline flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Preventivi Recenti
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/quotes')}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentQuotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nessun preventivo caricato.</p>
                    ) : (
                      recentQuotes.map(q => (
                        <div
                          key={q.id}
                          onClick={() => router.push('/dashboard/quotes')}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer group"
                        >
                          <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded">
                            <Package className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium line-clamp-1 group-hover:underline">
                              {q.riferimento || q.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(q.uploadedAt), 'dd/MM/yyyy')}
                              {q.scadenza && (
                                <span className="ml-2 text-orange-500">
                                  · scade {format(parseISO(q.scadenza), 'dd/MM')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Installers overview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-headline flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-violet-500" />
                    Installatori Gestiti
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {companies.length} installatori nel portafoglio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-36">
                    {companies.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nessun installatore associato.</p>
                    ) : (
                      <div className="space-y-2 pr-2">
                        {companies.map(c => (
                          <div key={c.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
                            <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium line-clamp-1">{c.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

            </div>
          </div>

          {/* Closed tickets summary */}
          {closedTickets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Ticket Chiusi di Recente
                </CardTitle>
                <CardDescription>Gli ultimi {Math.min(closedTickets.length, 5)} ticket risolti</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {closedTickets
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .slice(0, 5)
                    .map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => router.push(`/dashboard/support?id=${ticket.id}`)}
                        className="flex items-center gap-2 p-3 rounded-lg border bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100/60 cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium line-clamp-1">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(parseISO(ticket.updatedAt), { addSuffix: true, locale: it })}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

        </main>
      </ScrollArea>
    </>
  );
}
