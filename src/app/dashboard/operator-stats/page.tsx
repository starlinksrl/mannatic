'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/user-context';
import { Header } from '@/components/dashboard/header';
import { OperatorStat, getOperatorStats } from '@/lib/data';
import { Loader, Users, TicketCheck, FileText, Clock, ShieldCheck, Shield, TrendingUp, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    minutes <= 60 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : minutes <= 240 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      <Clock className="h-3 w-3" />
      {formatResponseTime(minutes)}
    </span>
  );
}

export default function OperatorStatsPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<OperatorStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isDistributor = user?.role === 'Distributor';
  const isDistributorAdmin = user?.role === 'DistributorAdmin';
  const canView = isDistributor || isDistributorAdmin;

  useEffect(() => {
    if (!canView || !user) return;
    const distributorId = isDistributor ? user.id : user.distributorId;
    if (!distributorId) { setIsLoading(false); return; }
    getOperatorStats(distributorId).then(s => {
      setStats(s);
      setIsLoading(false);
    });
  }, [user]);

  if (!user || !canView) {
    return (
      <>
        <Header title="Statistiche Operatori" />
        <div className="flex flex-1 items-center justify-center text-muted-foreground">Accesso non autorizzato.</div>
      </>
    );
  }

  const totalTickets = stats.reduce((sum, s) => sum + s.ticketsHandled, 0);
  const totalQuotes = stats.reduce((sum, s) => sum + s.quotesUploaded, 0);
  const avgResponse = stats.filter(s => s.avgResponseMinutes !== null);
  const overallAvgResponse = avgResponse.length > 0
    ? Math.round(avgResponse.reduce((sum, s) => sum + (s.avgResponseMinutes ?? 0), 0) / avgResponse.length)
    : null;
  const topOperator = [...stats].sort((a, b) => b.ticketsHandled - a.ticketsHandled)[0];

  return (
    <>
      <Header title="Statistiche Operatori" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Statistiche Operatori</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Performance del team: ticket gestiti, preventivi e tempi di risposta.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader className="h-8 w-8 animate-spin" /></div>
        ) : stats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground space-y-3">
            <Users className="h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">Nessun operatore trovato</p>
            <p className="text-sm">Crea operatori dalla pagina &quot;Operatori&quot; per vedere le statistiche.</p>
          </div>
        ) : (
          <>
            {/* Summary KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Operatori totali</p>
                <p className="text-3xl font-bold">{stats.length}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> nel team
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Ticket gestiti</p>
                <p className="text-3xl font-bold">{totalTickets}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TicketCheck className="h-3 w-3" /> totale team
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Preventivi caricati</p>
                <p className="text-3xl font-bold">{totalQuotes}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> totale team
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Risposta media</p>
                <p className="text-3xl font-bold">{formatResponseTime(overallAvgResponse)}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> dal ticket al 1° messaggio
                </p>
              </div>
            </div>

            {/* Top performer banner */}
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
                        <span className="flex items-center justify-center gap-1">
                          <TicketCheck className="h-3.5 w-3.5" /> Ticket
                        </span>
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                        <span className="flex items-center justify-center gap-1">
                          <FileText className="h-3.5 w-3.5" /> Preventivi
                        </span>
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                        <span className="flex items-center justify-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> Tempo risposta
                        </span>
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                        <span className="flex items-center justify-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5" /> Attività
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats
                      .sort((a, b) => b.ticketsHandled - a.ticketsHandled)
                      .map((op, idx) => {
                        const activityScore = op.ticketsHandled + op.quotesUploaded;
                        const maxScore = Math.max(...stats.map(s => s.ticketsHandled + s.quotesUploaded), 1);
                        const pct = Math.round((activityScore / maxScore) * 100);
                        return (
                          <tr key={op.operatorId} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx === 0 && op.ticketsHandled > 0 ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}>
                            {/* Name */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  op.role === 'DistributorAdmin'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                  {op.operatorName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium leading-tight">{op.operatorName}</p>
                                  <p className="text-xs text-muted-foreground">{op.operatorEmail}</p>
                                </div>
                                {idx === 0 && op.ticketsHandled > 0 && (
                                  <Award className="h-4 w-4 text-yellow-500" title="Top performer" />
                                )}
                              </div>
                            </td>
                            {/* Role */}
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                op.role === 'DistributorAdmin'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                              }`}>
                                {op.role === 'DistributorAdmin'
                                  ? <ShieldCheck className="h-3 w-3" />
                                  : <Shield className="h-3 w-3" />
                                }
                                {op.role === 'DistributorAdmin' ? 'Admin' : 'Utente'}
                              </span>
                            </td>
                            {/* Tickets */}
                            <td className="px-4 py-3 text-center font-semibold">
                              {op.ticketsHandled > 0
                                ? <span className="text-green-600 dark:text-green-400">{op.ticketsHandled}</span>
                                : <span className="text-muted-foreground">0</span>
                              }
                            </td>
                            {/* Quotes */}
                            <td className="px-4 py-3 text-center font-semibold">
                              {op.quotesUploaded > 0
                                ? <span className="text-blue-600 dark:text-blue-400">{op.quotesUploaded}</span>
                                : <span className="text-muted-foreground">0</span>
                              }
                            </td>
                            {/* Response time */}
                            <td className="px-4 py-3 text-center">
                              <ResponseTimeBadge minutes={op.avgResponseMinutes} />
                            </td>
                            {/* Activity bar */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
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
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Risposta &lt; 1h
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-500" /> Risposta 1h–4h
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Risposta &gt; 4h
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-400" /> — = nessun ticket gestito
              </span>
            </div>
          </>
        )}
      </main>
    </>
  );
}
