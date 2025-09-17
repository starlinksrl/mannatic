
'use client';

import { Header } from '@/components/dashboard/header';
import { getInterventions, getUsers } from '@/lib/data';
import { Intervention, ScheduledMaintenance } from '@/lib/types';
import { isAfter } from 'date-fns';
import { KpiDashboard } from '@/components/dashboard/kpi-dashboard';
import { useUser } from '@/contexts/user-context';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { GenerateKpiDashboardInput } from '@/ai/flows/generate-kpi-dashboard';
import { Building } from 'lucide-react';
import { useRouter } from 'next/navigation';

type KpiData = GenerateKpiDashboardInput & { 
  operatorWorkloadData: { name: string, workload: number }[],
  highPriorityInterventions: (Intervention | ScheduledMaintenance)[],
};

export default function DashboardPage() {
  const { user, currentCompany } = useUser();
  const router = useRouter();
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'Creator' && !currentCompany) {
      router.replace('/dashboard/companies');
      return;
    }
    
    async function getKpiData() {
      if (!currentCompany) {
          setLoading(false);
          return;
      };

      setLoading(true);

      const now = new Date();
      const interventions = await getInterventions(currentCompany.id);
      const users = await getUsers(currentCompany.id);

      const openInterventions = interventions.filter(i => i.status === 'Nuovo' || i.status === 'In corso' || i.status === 'In attesa');
      const closedInterventions = interventions.filter(i => i.status === 'Completato' || i.status === 'Annullato');
      
      const totalClosedOrInProgress = interventions.filter(i => i.status === 'Completato' || i.status === 'In corso');
      const onTime = totalClosedOrInProgress.filter(i => {
        if(i.completedAt) {
          return !isAfter(new Date(i.completedAt), new Date(i.dueDate));
        }
        return !isAfter(now, new Date(i.dueDate));
      });
      const slaAdherencePercentage = totalClosedOrInProgress.length > 0 ? Math.round((onTime.length / totalClosedOrInProgress.length) * 100) : 100;

      const overdueMaintenanceTasks = interventions.filter(i => {
        const isMaintenance = 'periodicity' in i;
        return isMaintenance && (i.status === 'Nuovo' || i.status === 'In corso') && isAfter(now, new Date(i.dueDate));
      }).length;
      
      const operatorWorkload: Record<string, number> = {};
      users.filter(u => u.role === 'Operator').forEach(op => {
        operatorWorkload[op.name] = openInterventions.filter(i => i.assignedOperatorId === op.id).length;
      });

      const operatorWorkloadData = Object.entries(operatorWorkload).map(([name, workload]) => ({ name, workload }));

      const highPriorityInterventions = interventions.filter(i => i.priority === 'Alta' || i.priority === 'Critica').slice(0, 3);

      setKpiData({
        openInterventions: openInterventions.length,
        closedInterventions: closedInterventions.length,
        slaAdherencePercentage,
        overdueMaintenanceTasks,
        operatorWorkload,
        operatorWorkloadData,
        highPriorityInterventions,
      });
      setLoading(false);
    }

    if (user) {
      getKpiData();
    }
  }, [user, currentCompany, router]);

  const NoCompanySelected = () => (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Building className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-semibold">Nessuna azienda selezionata</h2>
        <p className="mt-2 text-muted-foreground">Seleziona un'azienda dal menu in alto a destra per visualizzare la dashboard.</p>
    </div>
  )
  
  if (!currentCompany) {
      return (
         <>
            <Header title="Dashboard" />
            <NoCompanySelected />
        </>
      )
  }

  return (
    <>
      <Header title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        {loading || !kpiData ? (
          <div className="flex items-center justify-center flex-1 h-full">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <KpiDashboard kpiData={kpiData} />
        )}
      </main>
    </>
  );
}
