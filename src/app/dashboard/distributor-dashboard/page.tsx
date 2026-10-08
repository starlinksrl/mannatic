'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import {
  getSupportTicketsForDistributor,
  getQuotesForDistributor,
  getCompaniesByDistributorId,
  getOperatorStats,
  OperatorStat,
} from '@/lib/data';
import { SupportTicket, DistributorQuote, Company } from '@/lib/types';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Loader, LifeBuoy, FileText, Building, TicketCheck, Clock,
  AlertTriangle, CheckCircle2, ArrowRight, CalendarClock,
  Package, Users, ShieldCheck, Shield, Award, TrendingUp,
  BarChart3, UserCog, Import
} from 'lucide-react';
import { ImportInstallersDialog } from '@/components/dashboard/import-installers-dialog';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/* ─── helpers ──────────────────────────────────────────────── */

function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function ResponseTimeBadge({ minutes }: { minutes: number | null }) {
  if (minutes === null) return <span className="text-muted-foreground text-sm">—</span>;
  const color =
    minutes <= 60
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : minutes <= 240
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      <Clock className="h-3 w-3" />
      {formatResponseTime(minutes)}
    </span>
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

function KpiCard({
  title, value, icon, color, onClick,
}: {
  title: string; value: number | string; icon: React.ReactNode; color: string; onClick?: () => void;
}) {
  return (
    <Card
      className={cn('relative overflow-hidden transition-all duration-200', onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5')}
      onClick={onClick}
    >
      <div className={cn('absolute inset-0 opacity-5', color)} />
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn('p-3 rounded-xl text-white', color)}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── main component ─────────────────────────────────────────── */

export default function DistributorDashboard() {
  const { user } = useUser();
  const router = useRouter();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [quotes, setQuotes] = useState<DistributorQuote[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [operatorStats, setOperatorStats] = useState<OperatorStat[]>([]);
  const [loading, setLoading] = useState(true);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const isDistributor = user?.role === 'Distributor';

  const loadData = async () => {
      if (!user || !isDistributor) return;
      setLoading(true);
      const [t, q, c, ops] = await Promise.all([
        getSupportTicketsForDistributor(user.id),
        getQuotesForDistributor(user.id),
        getCompaniesByDistributorId(user.id),
        getOperatorStats(user.id),
      ]);
      setTickets(t);
      setQuotes(q);
      setCompanies(c);
      setOperatorStats(ops);
      setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    if (!isDistributor) { router.replace('/dashboard'); return; }
    loadData();
  }, [user]);

  if (!user || loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* derived data */
  const openTickets = tickets.filter(t => t.status === 'Aperto');
  const inProgressTickets = tickets.filter(t => t.status === 'In Lavorazione');
  const closedTickets = tickets.filter(t => t.status === 'Chiuso');
  const recentQuotes = quotes.slice(0, 5);

  const sortedOpenTickets = [...openTickets, ...inProgressTickets].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  /* operator stats aggregates */
  const totalTicketsHandled = operatorStats.reduce((s, o) => s + o.ticketsHandled, 0);
  const totalQuotesUploaded = operatorStats.reduce((s, o) => s + o.quotesUploaded, 0);
  const respondingOps = operatorStats.filter(o => o.avgResponseMinutes !== null);
  const overallAvgResponse =
    respondingOps.length > 0
      ? Math.round(respondingOps.reduce((s, o) => s + (o.avgResponseMinutes ?? 0), 0) / respondingOps.length)
      : null;
  const topOperator = [...operatorStats].sort((a, b) => b.ticketsHandled - a.ticketsHandled)[0];

  return (
    <>
      <Header title="Dashboard Distributore" />
      <ScrollArea className="flex-1">
        <main className="p-4 md:p-6 lg:p-8 space-y-6">

          {/* ── Welcome banner ── */}
          <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Benvenuto, {user.name}!</h2>
                <p className="text-indigo-100 text-sm mt-1">
                  Pannello di controllo distributore — panoramica completa di ticket, preventivi e team.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm bg-white/20 rounded-lg px-4 py-2">
                <CalendarClock className="h-4 w-4" />
                <span>{format(new Date(), 'EEEE d MMMM yyyy', { locale: it })}</span>
              </div>
            </div>
          </div>

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Ticket Aperti" value={openTickets.length} icon={<AlertTriangle className="h-5 w-5" />} color="bg-red-500" onClick={() => router.push('/dashboard/support')} />
            <KpiCard title="In Lavorazione" value={inProgressTickets.length} icon={<Clock className="h-5 w-5" />} color="bg-yellow-500" onClick={() => router.push('/dashboard/support')} />
            <KpiCard title="Preventivi Totali" value={quotes.length} icon={<FileText className="h-5 w-5" />} color="bg-blue-500" onClick={() => router.push('/dashboard/quotes')} />
            <KpiCard title="Installatori" value={companies.length} icon={<Building className="h-5 w-5" />} color="bg-violet-500" onClick={() => router.push('/dashboard/companies')} />
          </div>

          {/* ── Tickets + Quotes + Companies ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Open tickets (wide) */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <LifeBuoy className="h-5 w-5 text-red-500" />
                    Ticket Aperti
                  </CardTitle>
                  <CardDescription>
                    {sortedOpenTickets.length > 0 ? `${sortedOpenTickets.length} ticket da gestire` : 'Nessun ticket aperto'}
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
                      <p className="text-sm">Nessun ticket aperto — tutto in ordine!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pr-2">
                      {sortedOpenTickets.map(ticket => (
                        <div
                          key={ticket.id}
                          onClick={() => router.push(`/dashboard/support?id=${ticket.id}`)}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors group"
                        >
                          <TicketCheck className="h-5 w-5 mt-0.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold line-clamp-1 group-hover:underline">{ticket.subject}</p>
                              <TicketStatusBadge status={ticket.status} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ticket.clientName}</p>
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
              {/* Recent quotes */}
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
                            <p className="text-xs font-medium line-clamp-1 group-hover:underline">{q.riferimento || q.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(q.uploadedAt), 'dd/MM/yyyy')}
                              {q.scadenza && (
                                <span className="ml-2 text-orange-500">· scade {format(parseISO(q.scadenza), 'dd/MM')}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Installers */}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="font-headline flex items-center gap-2 text-base">
                      <Users className="h-4 w-4 text-violet-500" />
                      Installatori
                    </CardTitle>
                    <CardDescription className="text-xs">{companies.length} nel portafoglio</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
                    <Import className="h-4 w-4 mr-1" /> Importa
                  </Button>
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

          {/* ── Operator Statistics ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" />
                  Statistiche Operatori
                </CardTitle>
                <CardDescription>Performance del team: ticket, preventivi e tempi di risposta.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/operator-stats')}>
                <UserCog className="h-4 w-4 mr-1" /> Dettaglio
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">

              {operatorStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Users className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Nessun operatore. Creane uno dalla pagina Operatori.</p>
                </div>
              ) : (
                <>
                  {/* Aggregate KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Operatori', value: operatorStats.length, icon: <Users className="h-4 w-4" />, color: 'text-indigo-500' },
                      { label: 'Ticket gestiti', value: totalTicketsHandled, icon: <TicketCheck className="h-4 w-4" />, color: 'text-green-500' },
                      { label: 'Preventivi', value: totalQuotesUploaded, icon: <FileText className="h-4 w-4" />, color: 'text-blue-500' },
                      { label: 'Risposta media', value: formatResponseTime(overallAvgResponse), icon: <Clock className="h-4 w-4" />, color: 'text-orange-500' },
                    ].map(k => (
                      <div key={k.label} className="rounded-xl border bg-muted/30 p-3 space-y-0.5">
                        <p className={cn('flex items-center gap-1 text-xs text-muted-foreground', k.color)}>
                          {k.icon} {k.label}
                        </p>
                        <p className="text-2xl font-bold">{k.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Top performer */}
                  {topOperator && topOperator.ticketsHandled > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 p-4">
                      <Award className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Top performer: {topOperator.operatorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {topOperator.ticketsHandled} ticket gestiti
                          {topOperator.avgResponseMinutes !== null && ` · risposta media ${formatResponseTime(topOperator.avgResponseMinutes)}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Per-operator table */}
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Operatore</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ruolo</th>
                            <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                              <span className="flex items-center justify-center gap-1"><TicketCheck className="h-3.5 w-3.5" /> Ticket</span>
                            </th>
                            <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                              <span className="flex items-center justify-center gap-1"><FileText className="h-3.5 w-3.5" /> Preventivi</span>
                            </th>
                            <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                              <span className="flex items-center justify-center gap-1"><Clock className="h-3.5 w-3.5" /> Risposta</span>
                            </th>
                            <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                              <span className="flex items-center justify-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Attività</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...operatorStats]
                            .sort((a, b) => b.ticketsHandled - a.ticketsHandled)
                            .map((op, idx) => {
                              const score = op.ticketsHandled + op.quotesUploaded;
                              const maxScore = Math.max(...operatorStats.map(s => s.ticketsHandled + s.quotesUploaded), 1);
                              const pct = Math.round((score / maxScore) * 100);
                              const isTop = idx === 0 && op.ticketsHandled > 0;
                              return (
                                <tr
                                  key={op.operatorId}
                                  className={cn(
                                    'border-b last:border-0 hover:bg-muted/30 transition-colors',
                                    isTop && 'bg-yellow-50/50 dark:bg-yellow-950/10'
                                  )}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className={cn(
                                        'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                                        op.role === 'DistributorAdmin'
                                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                      )}>
                                        {op.operatorName.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-medium leading-tight">{op.operatorName}</p>
                                        <p className="text-xs text-muted-foreground">{op.operatorEmail}</p>
                                      </div>
                                      {isTop && <Award className="h-4 w-4 text-yellow-500" />}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={cn(
                                      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                                      op.role === 'DistributorAdmin'
                                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                                    )}>
                                      {op.role === 'DistributorAdmin' ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                                      {op.role === 'DistributorAdmin' ? 'Admin' : 'Utente'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center font-semibold">
                                    {op.ticketsHandled > 0
                                      ? <span className="text-green-600 dark:text-green-400">{op.ticketsHandled}</span>
                                      : <span className="text-muted-foreground">0</span>}
                                  </td>
                                  <td className="px-4 py-3 text-center font-semibold">
                                    {op.quotesUploaded > 0
                                      ? <span className="text-blue-600 dark:text-blue-400">{op.quotesUploaded}</span>
                                      : <span className="text-muted-foreground">0</span>}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <ResponseTimeBadge minutes={op.avgResponseMinutes} />
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 justify-center">
                                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" /> Risposta &lt; 1h</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Risposta 1h–4h</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Risposta &gt; 4h</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400" /> — = nessun ticket</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Closed tickets summary ── */}
          {closedTickets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Ticket Chiusi di Recente
                </CardTitle>
                <CardDescription>Gli ultimi {Math.min(closedTickets.length, 6)} ticket risolti</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {[...closedTickets]
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .slice(0, 6)
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
      {user && (
          <ImportInstallersDialog 
              isOpen={isImportModalOpen}
              onClose={() => setIsImportModalOpen(false)}
              onSuccess={loadData}
              distributorId={user.id}
          />
      )}
    </>
  );
}
