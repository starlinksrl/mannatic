

'use client';

import { GenerateKpiDashboardInput } from '@/ai/flows/generate-kpi-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import React from 'react';
import { KpiCard } from './kpi-card';
import { Activity, AlertOctagon, Check, Clock } from 'lucide-react';
import { Intervention, ScheduledMaintenance, User } from '@/lib/types';

interface KpiDashboardProps {
  kpiData: GenerateKpiDashboardInput & {
      openInterventions: number;
      closedInterventions: number;
      slaAdherencePercentage: number;
      overdueMaintenanceTasks: number; 
      operatorWorkloadData: { name: string, workload: number }[],
      highPriorityInterventions: (Intervention | ScheduledMaintenance)[],
    };
  currentUser: User;
}

export function KpiDashboard({ kpiData, currentUser }: KpiDashboardProps) {
  const isClient = currentUser.role === 'Client';
  const isOperator = currentUser.role === 'Operator';

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
         {(!isClient && !isOperator) && (
            <KpiCard
                title="Manutenzioni Scadute"
                value={kpiData.overdueMaintenanceTasks}
                icon={<AlertOctagon className="h-4 w-4 text-muted-foreground" />}
                description="Attività di manutenzione in ritardo"
                />
         )}
        <KpiCard
          title="Interventi Chiusi (30d)"
          value={kpiData.closedInterventions}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          description="Completati nell'ultimo mese"
        />
      </div>

      <div className={`grid grid-cols-1 ${isClient ? '' : 'lg:grid-cols-2'} gap-6`}>
        {(!isClient && !isOperator) && (
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
                    <Bar dataKey="workload" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
