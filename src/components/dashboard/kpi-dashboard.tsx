'use client';

import { GenerateKpiDashboardInput } from '@/ai/flows/generate-kpi-dashboard';
import { getKpiDashboardDescription } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import React, { useState, useEffect } from 'react';
import { KpiCard } from './kpi-card';
import { Activity, AlertOctagon, Check, Clock, Users } from 'lucide-react';
import { interventions } from '@/lib/data';
import { Badge } from '../ui/badge';

interface KpiDashboardProps {
  kpiData: GenerateKpiDashboardInput & { operatorWorkloadData: { name: string, workload: number }[] };
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export function KpiDashboard({ kpiData }: KpiDashboardProps) {
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDescription = async () => {
      setIsLoading(true);
      const result = await getKpiDashboardDescription(kpiData);
      setDescription(result.dashboardDescription);
      setIsLoading(false);
    };
    fetchDescription();
  }, [kpiData]);

  const interventionStatusData = [
    { name: 'Aperti', value: kpiData.openInterventions },
    { name: 'Chiusi', value: kpiData.closedInterventions },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Interventi Aperti"
          value={kpiData.openInterventions}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          description="Interventi che richiedono azione"
        />
        <KpiCard
          title="Adesione SLA"
          value={`${kpiData.slaAdherencePercentage}%`}
          icon={<Check className="h-4 w-4 text-muted-foreground" />}
          description="Percentuale interventi nei tempi"
        />
        <KpiCard
          title="Manutenzioni Scadute"
          value={kpiData.overdueMaintenanceTasks}
          icon={<AlertOctagon className="h-4 w-4 text-muted-foreground" />}
          description="Attività di manutenzione in ritardo"
        />
        <KpiCard
          title="Interventi Chiusi (30d)"
          value={kpiData.closedInterventions}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          description="Completati nell'ultimo mese"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Analisi AI della Dashboard</CardTitle>
            <CardDescription>Riepilogo intelligente e suggerimenti basati sui dati attuali.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Carico Operatori</CardTitle>
            <CardDescription>Numero di interventi aperti per operatore.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={kpiData.operatorWorkloadData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Bar dataKey="workload" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Interventi ad alta priorità</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {interventions.filter(i => i.priority === 'Alta' || i.priority === 'Critica').slice(0, 3).map(int => (
                    <div key={int.id} className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">{int.title}</p>
                            <p className="text-sm text-muted-foreground">ID: {int.id}</p>
                        </div>
                        <Badge variant={int.priority === 'Critica' ? 'destructive' : 'secondary'} className="text-accent-foreground">{int.priority}</Badge>
                    </div>
                ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
