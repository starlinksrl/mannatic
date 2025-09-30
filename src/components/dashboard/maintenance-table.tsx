

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ScheduledMaintenance, User, Client } from '@/lib/types';
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
import { format, formatDistanceToNow, isBefore, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { getClient, getOperator, deleteScheduledMaintenance } from '@/lib/data';
import { Button } from '../ui/button';
import { MoreHorizontal, PlusCircle, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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
  clients: Client[];
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
      return isBefore(new Date(task.nextDueDate), new Date()) && task.status !== 'Completato' && task.status !== 'Annullato';
  }

  const filteredTasks = useMemo(() => {
    let filtered = maintenanceTasks;
    const now = new Date();
    const oneMonthFromNow = addDays(now, 30);

    if (statusFilter === 'In scadenza') {
        filtered = filtered.filter(task => {
            const nextDueDate = new Date(task.nextDueDate);
            return isBefore(nextDueDate, oneMonthFromNow) && isBefore(now, nextDueDate) && task.status !== 'Completato' && task.status !== 'Annullato';
        });
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
             case 'operator':
                aValue = a.assignedOperatorId ? operatorsMap.get(a.assignedOperatorId) || '' : '';
                bValue = b.assignedOperatorId ? operatorsMap.get(b.assignedOperatorId) || '' : '';
                break;
            default:
                aValue = a[sortConfig.key as keyof ScheduledMaintenance];
                bValue = b[sortConfig.key as keyof ScheduledMaintenance];
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
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
    if (task.periodicity === 'monthly' && task.recurrenceMonths > 0) {
        return `Ogni ${task.recurrenceMonths} mes${task.recurrenceMonths > 1 ? 'i' : 'e'}`;
    }
    const map = {
        daily: 'Giornaliera',
        weekly: 'Settimanale',
        monthly: 'Mensile',
        yearly: 'Annuale'
    };
    return map[task.periodicity];
  }


  return (
    <div className="space-y-4">
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
                        <SelectItem value="In scadenza">In scadenza (30gg)</SelectItem>
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
      <Card className="xl:hidden">
        <CardContent className="p-2 space-y-2">
            {sortedTasks.map((task) => {
              const clientName = clientsMap.get(task.clientId);
              return (
                 <div key={task.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex justify-between items-start">
                    <div className="flex-1 space-y-1 cursor-pointer" onClick={() => handleEditClick(task)}>
                        <p className="font-medium">{task.title}</p>
                        {currentUser.role !== 'Client' && <p className="text-sm text-muted-foreground">{clientName}</p>}
                        <p className="text-sm text-muted-foreground">Prossima scadenza: {format(new Date(task.nextDueDate), 'dd MMM yyyy', { locale: it })}</p>
                        <div className="flex items-center gap-2 pt-1">
                            {getStatusBadge(task)}
                            <Badge variant="outline">{getPeriodicityText(task)}</Badge>
                        </div>
                    </div>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
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
      <Card className="hidden xl:block">
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
              const operatorName = task.assignedOperatorId ? operatorsMap.get(task.assignedOperatorId) : null;
              return (
                <TableRow key={task.id}>
                    <TableCell className="font-medium cursor-pointer" onClick={() => handleEditClick(task)}>
                        <div className="flex flex-col">
                            <span>{task.title}</span>
                            <span className="text-xs text-muted-foreground">ID: {task.id}</span>
                        </div>
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => handleEditClick(task)}>{clientName}</TableCell>
                    <TableCell className="cursor-pointer" onClick={() => handleEditClick(task)}>{getStatusBadge(task)}</TableCell>
                    <TableCell className="cursor-pointer" onClick={() => handleEditClick(task)}>{getPeriodicityText(task)}</TableCell>
                    <TableCell className="cursor-pointer" onClick={() => handleEditClick(task)}>
                        {format(new Date(task.nextDueDate), 'dd MMM yyyy', { locale: it })}
                        <p className="text-xs text-muted-foreground">
                            ({formatDistanceToNow(new Date(task.nextDueDate), { locale: it, addSuffix: true })})
                        </p>
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => handleEditClick(task)}>{operatorName || 'Non assegnato'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
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
