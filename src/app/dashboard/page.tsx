import { Header } from '@/components/dashboard/header';
import { getInterventions, getUsers } from '@/lib/data';
import { Intervention, ScheduledMaintenance } from '@/lib/types';
import { isAfter } from 'date-fns';
import { KpiDashboard } from '@/components/dashboard/kpi-dashboard';

async function getKpiData() {
  const now = new Date();
  const interventions = await getInterventions();
  const users = await getUsers();

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

  return {
    openInterventions: openInterventions.length,
    closedInterventions: closedInterventions.length,
    slaAdherencePercentage,
    overdueMaintenanceTasks,
    operatorWorkload,
    operatorWorkloadData,
    highPriorityInterventions,
  };
}


export default async function DashboardPage() {
  const kpiData = await getKpiData();

  return (
    <>
      <Header title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <KpiDashboard kpiData={kpiData} />
      </main>
    </>
  );
}
