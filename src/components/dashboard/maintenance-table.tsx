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
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { getClient, getOperator } from '@/lib/data';
import { Button } from '../ui/button';
import { MoreHorizontal, PlusCircle, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AddMaintenanceForm } from './add-maintenance-form';
import { EditMaintenanceForm } from './edit-maintenance-form';

interface MaintenanceTableProps {
  maintenanceTasks: ScheduledMaintenance[];
  currentUser: User;
  clients: Client[];
  operators: User[];
  onMaintenanceAdded: (maintenance: ScheduledMaintenance) => void;
  onMaintenanceUpdated: (maintenance: ScheduledMaintenance) => void;
}

export function MaintenanceTable({ maintenanceTasks, currentUser, clients, operators, onMaintenanceAdded, onMaintenanceUpdated }: MaintenanceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [operatorsMap, setOperatorsMap] = useState<Map<string, string>>(new Map());

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<ScheduledMaintenance | null>(null);

  useEffect(() => {
    const map = new Map<string, string>();
    operators.forEach(op => map.set(op.id, op.name));
    setOperatorsMap(map);
  }, [operators]);

  const handleEditClick = (maintenance: ScheduledMaintenance) => {
    setSelectedMaintenance(maintenance);
    setIsEditModalOpen(true);
  }

  const filteredTasks = useMemo(() => {
    let filtered = maintenanceTasks;

    if (searchTerm) {
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [maintenanceTasks, searchTerm]);
  
  const getStatusBadge = (status: ScheduledMaintenance['status']) => {
    switch (status) {
      case 'Pianificato': return <Badge className="bg-purple-100 text-purple-800">Pianificato</Badge>;
      case 'Completato': return <Badge className="bg-green-100 text-green-800">Completato</Badge>;
      case 'In corso': return <Badge className="bg-blue-100 text-blue-800">In corso</Badge>;
      default: return <Badge>{status}</Badge>;
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
            <Input
                placeholder="Cerca per titolo o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
            {currentUser.role === 'Admin' &&
                <div className="md:ml-4">
                    <AddMaintenanceForm
                        clients={clients}
                        operators={operators}
                        onMaintenanceAdded={onMaintenanceAdded}
                    >
                        <Button className="w-full md:w-auto">
                            <PlusCircle className="mr-2" />
                            Crea Manutenzione
                        </Button>
                    </AddMaintenanceForm>
                </div>
            }
      </div>
      <Card className="md:hidden">
        <CardContent className="p-2 space-y-2">
            {filteredTasks.map((task) => {
              const client = getClient(task.clientId);
              return (
                 <div key={task.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex justify-between items-start" onClick={() => handleEditClick(task)}>
                    <div className="flex-1 space-y-1">
                        <p className="font-medium">{task.title}</p>
                        {currentUser.role !== 'Client' && <p className="text-sm text-muted-foreground">{client?.name}</p>}
                        <p className="text-sm text-muted-foreground">Prossima scadenza: {format(new Date(task.nextDueDate), 'dd MMM yyyy', { locale: it })}</p>
                        <div className="flex items-center gap-2 pt-1">
                            {getStatusBadge(task.status)}
                            <Badge variant="outline">{getPeriodicityText(task)}</Badge>
                        </div>
                    </div>
                     <DropdownMenu onOpenChange={(e) => e.stopPropagation()}>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => handleEditClick(task)}>
                            <Pencil className="mr-2" /> Modifica
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
              )
            })}
        </CardContent>
      </Card>
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Periodicità</TableHead>
                <TableHead>Prossima Scadenza</TableHead>
                <TableHead>Operatore</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => {
              const client = getClient(task.clientId);
              const operatorName = task.assignedOperatorId ? operatorsMap.get(task.assignedOperatorId) : null;
              return (
                <TableRow key={task.id} onClick={() => handleEditClick(task)} className="cursor-pointer">
                    <TableCell className="font-medium">
                        <div className="flex flex-col">
                            <span>{task.title}</span>
                            <span className="text-xs text-muted-foreground">ID: {task.id}</span>
                        </div>
                    </TableCell>
                    <TableCell>{client?.name}</TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell>{getPeriodicityText(task)}</TableCell>
                    <TableCell>
                        {format(new Date(task.nextDueDate), 'dd MMM yyyy', { locale: it })}
                        <p className="text-xs text-muted-foreground">
                            ({formatDistanceToNow(new Date(task.nextDueDate), { locale: it, addSuffix: true })})
                        </p>
                    </TableCell>
                    <TableCell>{operatorName || 'Non assegnato'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                         <DropdownMenuItem onSelect={() => handleEditClick(task)}>
                             <Pencil className="mr-2" /> Modifica
                         </DropdownMenuItem>
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
        onMaintenanceUpdated={onMaintenanceUpdated}
        clients={clients}
        operators={operators}
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
      />
    </div>
  );
}
