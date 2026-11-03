
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ScheduledMaintenance, User } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, formatDistanceToNow, isBefore, addDays, startOfToday, addMonths, setHours, setMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import { deleteScheduledMaintenance, updateScheduledMaintenance } from '@/lib/data';
import { Button } from '../ui/button';
import { MoreHorizontal, PlusCircle, Pencil, Trash2, ChevronDown, ChevronUp, Euro, TrendingUp, ClipboardList, CheckCircle2, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { AddMaintenanceForm } from './add-maintenance-form';
import { EditMaintenanceForm } from './edit-maintenance-form';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MaintenanceTableProps {
  maintenanceTasks: ScheduledMaintenance[];
  currentUser: User;
  clients: User[];
  operators: User[];
  onMaintenanceChange: () => void;
}

const statusOrder: Record<string, number> = { 'Pianificato': 1, 'In corso': 2, 'Completato': 3, 'Annullato': 4 };

export function MaintenanceTable({ maintenanceTasks: initialMaintenanceTasks, currentUser, clients, operators, onMaintenanceChange }: MaintenanceTableProps) {
  const { toast } = useToast();
  const [maintenanceTasks, setMaintenanceTasks] = useState(initialMaintenanceTasks);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('In scadenza');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ScheduledMaintenance | 'client' | 'operator'; direction: 'ascending' | 'descending' } | null>({ key: 'nextDueDate', direction: 'ascending' });
  
  const [clientsMap, setClientsMap] = useState<Map<string, string>>(new Map());
  const [operatorsMap, setOperatorsMap] = useState<Map<string, string>>(new Map());

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<ScheduledMaintenance | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<ScheduledMaintenance | null>(null);

  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [maintenanceToExecute, setMaintenanceToExecute] = useState<ScheduledMaintenance | null>(null);
  const [executionNote, setExecutionNote] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  
  useEffect(() => {
    setMaintenanceTasks(initialMaintenanceTasks);
  }, [initialMaintenanceTasks]);

  useEffect(() => {
    const opMap = new Map<string, string>();
    operators.forEach(op => opMap.set(op.id, op.name));
    setOperatorsMap(opMap);

    const cliMap = new Map<string, string>();
    clients.forEach(c => cliMap.set(c.id, c.name));
    setClientsMap(cliMap);
  }, [operators, clients]);

  const handleEditClick = (maintenance: ScheduledMaintenance) => {
    setSelectedMaintenance(maintenance);
    setIsEditModalOpen(true);
  }
  
  const handleDeleteClick = (maintenance: ScheduledMaintenance) => {
    setMaintenanceToDelete(maintenance);
    setIsDeleteDialogOpen(true);
  }

  const getNextRenewalDate = (maintenance: ScheduledMaintenance): Date => {
    const months = Number(maintenance.recurrenceMonths) || 1;
    const now = new Date();
    const currentDue = maintenance.nextDueDate ? new Date(maintenance.nextDueDate) : now;
    const baseDate = !isNaN(currentDue.getTime()) && isBefore(now, currentDue) ? currentDue : now;
    return setHours(setMinutes(addMonths(baseDate, months), 0), 12);
  };

  const handleExecuteClick = (maintenance: ScheduledMaintenance) => {
    setMaintenanceToExecute(maintenance);
    setExecutionNote('');
    setIsExecuteDialogOpen(true);
  };

  const confirmExecuteAndRenew = async () => {
    if (!maintenanceToExecute) return;
    setIsExecuting(true);
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const renewedDate = getNextRenewalDate(maintenanceToExecute);
      const renewedDateIso = renewedDate.toISOString();
      const formattedNow = format(now, 'dd/MM/yyyy', { locale: it });
      const formattedNext = format(renewedDate, 'dd/MM/yyyy', { locale: it });

      const noteSuffix = executionNote.trim() ? ` — Note: ${executionNote.trim()}` : '';
      const newUpdateEntry = {
        date: nowIso,
        description: `Manutenzione eseguita il ${formattedNow}. Prossima scadenza rinnovata al ${formattedNext}${noteSuffix}`,
        userName: currentUser.name,
      };

      const updatedPayload: ScheduledMaintenance = {
        ...maintenanceToExecute,
        status: 'Pianificato',
        completedAt: nowIso,
        dueDate: renewedDateIso,
        nextDueDate: renewedDateIso,
        updates: [newUpdateEntry, ...(maintenanceToExecute.updates || [])],
      };

      const updated = await updateScheduledMaintenance(maintenanceToExecute.id, updatedPayload);
      if (updated) {
        onMaintenanceChange();
        toast({
          title: 'Manutenzione eseguita e rinnovata',
          description: `"${maintenanceToExecute.title}" registrata come eseguita. Nuova scadenza fissata al ${formattedNext}.`,
        });
        setIsExecuteDialogOpen(false);
        setMaintenanceToExecute(null);
        setExecutionNote('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Errore',
          description: 'Impossibile aggiornare e rinnovare la manutenzione.',
        });
      }
    } catch (error) {
      console.error('Error executing maintenance:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: "Si è verificato un errore durante il rinnovo della manutenzione.",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const confirmDelete = async () => {
    if (!maintenanceToDelete) return;
    const success = await deleteScheduledMaintenance(maintenanceToDelete.id);
    if (success) {
      onMaintenanceChange();
      toast({
        title: 'Manutenzione eliminata',
        description: `La manutenzione "${maintenanceToDelete.title}" è stata eliminata con successo.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: "Impossibile eliminare la manutenzione programmata.",
      });
    }
    setIsDeleteDialogOpen(false);
    setMaintenanceToDelete(null);
  }

  const isTaskOverdue = (task: ScheduledMaintenance) => {
      return isBefore(new Date(task.nextDueDate), startOfToday()) && task.status !== 'Completato' && task.status !== 'Annullato';
  }

  const filteredTasks = useMemo(() => {
    let filtered = maintenanceTasks;
    const now = new Date();
    
    if (statusFilter.startsWith('In scadenza')) {
        let limitDate;
        if (statusFilter === 'In scadenza (30gg)') {
            limitDate = addDays(now, 30);
        } else if (statusFilter === 'In scadenza (3 mesi)') {
            limitDate = addMonths(now, 3);
        } else if (statusFilter === 'In scadenza (6 mesi)') {
            limitDate = addMonths(now, 6);
        }

        if (limitDate) {
            filtered = filtered.filter(task => {
                const nextDueDate = new Date(task.nextDueDate);
                return isBefore(nextDueDate, limitDate) && isBefore(now, nextDueDate) && task.status !== 'Completato' && task.status !== 'Annullato';
            });
        }

    } else if (statusFilter === 'Scaduto') {
        filtered = filtered.filter(isTaskOverdue);
    } else if (statusFilter !== 'all') {
        filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [maintenanceTasks, searchTerm, statusFilter]);

  const sortedTasks = useMemo(() => {
    let sortableItems = [...filteredTasks];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        
        switch(sortConfig.key) {
            case 'status':
                const aIsOverdue = isTaskOverdue(a);
                const bIsOverdue = isTaskOverdue(b);
                if (aIsOverdue && !bIsOverdue) return -1;
                if (!aIsOverdue && bIsOverdue) return 1;
                aValue = statusOrder[a.status];
                bValue = statusOrder[b.status];
                break;
            case 'client':
                aValue = clientsMap.get(a.clientId) || '';
                bValue = clientsMap.get(b.clientId) || '';
                break;
             case 'operator': {
                const opIdA = a.assignedOperatorIds?.[0];
                const opIdB = b.assignedOperatorIds?.[0];
                aValue = opIdA ? operatorsMap.get(opIdA) || '' : '';
                bValue = opIdB ? operatorsMap.get(opIdB) || '' : '';
                break;
             }
            default:
                aValue = a[sortConfig.key as keyof ScheduledMaintenance];
                bValue = b[sortConfig.key as keyof ScheduledMaintenance];
        }

        if (aValue != null && bValue != null) {
          if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
        } else if (aValue != null) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        } else if (bValue != null) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTasks, sortConfig, clientsMap, operatorsMap]);
  
  const requestSort = (key: keyof ScheduledMaintenance | 'client' | 'operator') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof ScheduledMaintenance | 'client' | 'operator') => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  }
  
  const getStatusBadge = (task: ScheduledMaintenance) => {
    if (isTaskOverdue(task)) {
        return <Badge variant="destructive">Scaduto</Badge>;
    }
    switch (task.status) {
      case 'Pianificato': return <Badge className="bg-purple-100 text-purple-800">Pianificato</Badge>;
      case 'Completato': return <Badge className="bg-green-100 text-green-800">Completato</Badge>;
      case 'In corso': return <Badge className="bg-blue-100 text-blue-800">In corso</Badge>;
      case 'Annullato': return <Badge variant="outline" className="bg-gray-100 text-gray-800">Annullato</Badge>;
      default: return <Badge>{task.status}</Badge>;
    }
  };

  const getPeriodicityText = (task: ScheduledMaintenance) => {
    const months = task.recurrenceMonths || 1;
    return `Ogni ${months} mes${months > 1 ? 'i' : 'e'}`;
  };

  const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Creator';

  const maintenanceFinancialSummary = useMemo(() => {
    const activeTasks = maintenanceTasks.filter(t => t.status !== 'Annullato');
    const totalMonthlyFee = activeTasks.reduce((sum, t) => sum + (Number(t.cost) || 0), 0);
    const totalAnnualValue = totalMonthlyFee * 12;
    const tasksWithFee = activeTasks.filter(t => Number(t.cost) > 0).length;
    return {
      activeCount: activeTasks.length,
      tasksWithFee,
      totalMonthlyFee,
      totalAnnualValue,
    };
  }, [maintenanceTasks]);


  return (
    <div className="space-y-4">
        {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                            <Euro className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Canone Mensile Totale</p>
                            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                                € {maintenanceFinancialSummary.totalMonthlyFee.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-xs font-normal text-muted-foreground"> / mese</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Valore Annuale Manutenzioni</p>
                            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                                € {maintenanceFinancialSummary.totalAnnualValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-xs font-normal text-muted-foreground"> / anno</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Manutenzioni Attive</p>
                            <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                                {maintenanceFinancialSummary.activeCount}
                                <span className="text-xs font-normal text-muted-foreground"> ({maintenanceFinancialSummary.tasksWithFee} con canone)</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                 <Input
                    placeholder="Cerca per titolo o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="sm:col-span-2"
                />
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="Filtra per stato" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tutti gli stati</SelectItem>
                        <SelectItem value="In scadenza (30gg)">In scadenza (30gg)</SelectItem>
                        <SelectItem value="In scadenza (3 mesi)">In scadenza (3 mesi)</SelectItem>
                        <SelectItem value="In scadenza (6 mesi)">In scadenza (6 mesi)</SelectItem>
                        <SelectItem value="Scaduto">Scaduto</SelectItem>
                        <SelectItem value="Pianificato">Pianificato</SelectItem>
                        <SelectItem value="In corso">In corso</SelectItem>
                        <SelectItem value="Completato">Completato</SelectItem>
                        <SelectItem value="Annullato">Annullato</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {currentUser.role === 'Admin' &&
                <div className="md:ml-4">
                    <AddMaintenanceForm
                        clients={clients}
                        operators={operators}
                        onMaintenanceAdded={onMaintenanceChange}
                    >
                        <Button className="w-full md:w-auto">
                            <PlusCircle className="mr-2" />
                            Crea Manutenzione
                        </Button>
                    </AddMaintenanceForm>
                </div>
            }
      </div>
      <Card className="lg:hidden">
        <CardContent className="p-2 space-y-2">
            {sortedTasks.map((task) => {
              const clientName = clientsMap.get(task.clientId);
              return (
                 <div key={task.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex justify-between items-start">
                    <div className="flex-1 space-y-1 cursor-pointer" onClick={() => handleEditClick(task)}>
                        <p className="font-medium uppercase">{task.title}</p>
                        {currentUser.role !== 'Client' && <p className="text-sm text-muted-foreground uppercase">{clientName}</p>}
                        <p className="text-sm text-muted-foreground">Prossima scadenza: {format(new Date(task.nextDueDate), 'dd MMM yyyy', { locale: it })}</p>
                        {task.completedAt && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                Ultima esecuzione: {format(new Date(task.completedAt), 'dd MMM yyyy', { locale: it })}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            {getStatusBadge(task)}
                            <Badge variant="outline">{getPeriodicityText(task)}</Badge>
                            {isAdmin && task.cost !== null && task.cost !== undefined && Number(task.cost) > 0 && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                    € {Number(task.cost).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mese
                                </Badge>
                            )}
                        </div>
                        {currentUser.role !== 'Client' && task.status !== 'Annullato' && (
                            <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                                    onClick={() => handleExecuteClick(task)}
                                >
                                    <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" />
                                    Eseguita
                                </Button>
                            </div>
                        )}
                    </div>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {currentUser.role !== 'Client' && task.status !== 'Annullato' && (
                            <DropdownMenuItem onSelect={() => handleExecuteClick(task)} className="text-emerald-700 focus:text-emerald-700">
                                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Segna come Eseguita
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => handleEditClick(task)}>
                            <Pencil className="mr-2" /> Modifica
                        </DropdownMenuItem>
                        {currentUser.role === 'Admin' && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onSelect={() => handleDeleteClick(task)}>
                                    <Trash2 className="mr-2" /> Elimina
                                </DropdownMenuItem>
                            </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
              )
            })}
        </CardContent>
      </Card>
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('title')}>Titolo {getSortIcon('title')}</Button>
                </TableHead>
                <TableHead>
                     <Button variant="ghost" onClick={() => requestSort('client')}>Cliente {getSortIcon('client')}</Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('status')}>Stato {getSortIcon('status')}</Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('recurrenceMonths')}>Periodicità {getSortIcon('recurrenceMonths')}</Button>
                </TableHead>
                {isAdmin && (
                    <TableHead>
                        <Button variant="ghost" onClick={() => requestSort('cost')}>Canone Mensile {getSortIcon('cost')}</Button>
                    </TableHead>
                )}
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('nextDueDate')}>Prossima Scadenza {getSortIcon('nextDueDate')}</Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('operator')}>Operatore {getSortIcon('operator')}</Button>
                </TableHead>
                <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => {
              const clientName = clientsMap.get(task.clientId);
              const opId = task.assignedOperatorIds?.[0];
              const operatorName = opId ? operatorsMap.get(opId) : null;
              return (
                <TableRow key={task.id}>
                    <TableCell className="font-medium cursor-pointer" onClick={() => handleEditClick(task)}>
                        <span className="uppercase">{task.title}</span>
                    </TableCell>
                    <TableCell className="cursor-pointer uppercase" onClick={() => handleEditClick(task)}>{clientName}</TableCell>
                    <TableCell className="cursor-pointer" onClick={() => handleEditClick(task)}>{getStatusBadge(task)}</TableCell>
                    <TableCell className="cursor-pointer" onClick={() => handleEditClick(task)}>{getPeriodicityText(task)}</TableCell>
                    {isAdmin && (
                        <TableCell className="cursor-pointer font-semibold text-emerald-700 dark:text-emerald-400" onClick={() => handleEditClick(task)}>
                            {task.cost !== null && task.cost !== undefined && Number(task.cost) > 0
                                ? `€ ${Number(task.cost).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : <span className="text-muted-foreground font-normal">-</span>}
                        </TableCell>
                    )}
                    <TableCell className="cursor-pointer" onClick={() => handleEditClick(task)}>
                        {format(new Date(task.nextDueDate), 'dd MMM yyyy', { locale: it })}
                        <p className="text-xs text-muted-foreground">
                            ({formatDistanceToNow(new Date(task.nextDueDate), { locale: it, addSuffix: true })})
                        </p>
                        {task.completedAt && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                                Ultima esec.: {format(new Date(task.completedAt), 'dd/MM/yy', { locale: it })}
                            </p>
                        )}
                    </TableCell>
                    <TableCell className="cursor-pointer uppercase" onClick={() => handleEditClick(task)}>{operatorName || 'Non assegnato'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                        {currentUser.role !== 'Client' && task.status !== 'Annullato' && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                                onClick={() => handleExecuteClick(task)}
                            >
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                                Eseguita
                            </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                             {currentUser.role !== 'Client' && task.status !== 'Annullato' && (
                                 <DropdownMenuItem onSelect={() => handleExecuteClick(task)} className="text-emerald-700 focus:text-emerald-700">
                                     <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Segna come Eseguita
                                 </DropdownMenuItem>
                             )}
                             <DropdownMenuItem onSelect={() => handleEditClick(task)}>
                                 <Pencil className="mr-2" /> Modifica
                             </DropdownMenuItem>
                             {currentUser.role === 'Admin' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                        onSelect={() => handleDeleteClick(task)}>
                                        <Trash2 className="mr-2" /> Elimina
                                    </DropdownMenuItem>
                                </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <EditMaintenanceForm
        maintenance={selectedMaintenance}
        onMaintenanceUpdated={onMaintenanceChange}
        clients={clients}
        operators={operators}
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
      />
      <AlertDialog open={isExecuteDialogOpen} onOpenChange={(open) => {
        if (!isExecuting) {
          setIsExecuteDialogOpen(open);
          if (!open) setMaintenanceToExecute(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Conferma Manutenzione Eseguita
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground pt-1">
                <p>
                  Stai segnando come eseguita la manutenzione <b>{maintenanceToExecute?.title}</b>
                  {maintenanceToExecute && clientsMap.get(maintenanceToExecute.clientId) ? ` per il cliente ${clientsMap.get(maintenanceToExecute.clientId)}` : ''}.
                </p>
                {maintenanceToExecute && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
                    <p className="text-xs uppercase font-bold tracking-wider">Nuova Prossima Scadenza</p>
                    <p className="text-base font-bold mt-0.5">
                      {format(getNextRenewalDate(maintenanceToExecute), 'dd MMMM yyyy', { locale: it })}
                      <span className="text-xs font-normal ml-1">
                        (rinnovo automatico di {maintenanceToExecute.recurrenceMonths || 1} {(maintenanceToExecute.recurrenceMonths || 1) > 1 ? 'mesi' : 'mese'})
                      </span>
                    </p>
                  </div>
                )}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-medium text-foreground">Note sull&apos;esecuzione (opzionale)</label>
                  <Textarea
                    placeholder="Es. Filtro sostituito, controllo regolare..."
                    value={executionNote}
                    onChange={(e) => setExecutionNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExecuting}>Annulla</AlertDialogCancel>
            <Button
              onClick={confirmExecuteAndRenew}
              disabled={isExecuting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma Eseguita e Rinnova
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
                Questa azione non può essere annullata. La manutenzione <b>{maintenanceToDelete?.title}</b> verrà eliminata definitivamente.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Elimina</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
