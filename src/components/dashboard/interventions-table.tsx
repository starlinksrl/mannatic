
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Intervention, UserRole, User, Client } from '@/lib/types';
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
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { deleteIntervention } from '@/lib/data';
import { Button } from '../ui/button';
import { ChevronDown, ChevronUp, MoreHorizontal, PlusCircle, Pencil, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AddInterventionForm } from './add-intervention-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { EditInterventionForm } from './edit-intervention-form';
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


interface InterventionsTableProps {
  interventions: Intervention[];
  currentUser: User;
  clients: Client[];
  operators: User[];
}

const priorityOrder: Record<string, number> = { 'Critica': 4, 'Alta': 3, 'Media': 2, 'Bassa': 1 };
const statusOrder: Record<string, number> = { 'Nuovo': 1, 'In corso': 2, 'In attesa': 3, 'Completato': 4, 'Da Fatturare': 5, 'Fatturato': 6, 'Annullato': 7 };

export function InterventionsTable({ interventions: initialInterventions, currentUser, clients, operators }: InterventionsTableProps) {
  const { toast } = useToast();
  const [interventions, setInterventions] = useState(initialInterventions);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Intervention | 'client' | 'operator'; direction: 'ascending' | 'descending' } | null>({ key: 'dueDate', direction: 'ascending' });
  
  const [clientsMap, setClientsMap] = useState<Map<string, Client>>(new Map());
  const [operatorsMap, setOperatorsMap] = useState<Map<string, string>>(new Map());

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [interventionToDelete, setInterventionToDelete] = useState<Intervention | null>(null);

  useEffect(() => {
    setInterventions(initialInterventions);
  }, [initialInterventions]);

  useEffect(() => {
    const opMap = new Map<string, string>();
    operators.forEach(op => opMap.set(op.id, op.name));
    setOperatorsMap(opMap);

    const cliMap = new Map<string, Client>();
    clients.forEach(c => cliMap.set(c.id, c));
    setClientsMap(cliMap);
  }, [operators, clients]);

  const handleEditClick = (intervention: Intervention) => {
    setSelectedIntervention(intervention);
    setIsEditModalOpen(true);
  }

  const handleInterventionAdded = (newIntervention: Intervention) => {
    setInterventions(prev => [newIntervention, ...prev]);
  }
  
  const handleInterventionUpdated = (updatedIntervention: Intervention) => {
    setInterventions(prev => prev.map(i => i.id === updatedIntervention.id ? updatedIntervention : i));
  }
  
  const handleInterventionDeleted = (deletedInterventionId: string) => {
    setInterventions(prev => prev.filter(i => i.id !== deletedInterventionId));
  }

  const handleDeleteClick = (intervention: Intervention) => {
    setInterventionToDelete(intervention);
    setIsDeleteDialogOpen(true);
  }

  const confirmDelete = async () => {
      if (!interventionToDelete) return;
      const success = await deleteIntervention(interventionToDelete.id);
      if (success) {
          handleInterventionDeleted(interventionToDelete.id);
          toast({
              title: 'Intervento eliminato',
              description: `L'intervento "${interventionToDelete.title}" è stato eliminato con successo.`,
          });
      } else {
           toast({
              variant: 'destructive',
              title: 'Errore',
              description: "Impossibile eliminare l'intervento.",
          });
      }
      setIsDeleteDialogOpen(false);
      setInterventionToDelete(null);
  }


  const roleBasedInterventions = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin' || currentUser.role === 'Creator' || currentUser.role === 'Operator') {
      return interventions;
    }
    if (currentUser.role === 'Client') {
        return interventions.filter(i => i.clientId === currentUser.id);
    }
    return [];
  }, [interventions, currentUser]);

  const filteredInterventions = useMemo(() => {
    let filtered = roleBasedInterventions;

    if (searchTerm) {
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
        filtered = filtered.filter(i => i.priority === priorityFilter);
    }
    if (clientFilter !== 'all') {
        filtered = filtered.filter(i => i.clientId === clientFilter);
    }
    if (operatorFilter !== 'all') {
        filtered = filtered.filter(i => i.assignedOperatorId === operatorFilter);
    }

    return filtered;
  }, [roleBasedInterventions, searchTerm, statusFilter, priorityFilter, clientFilter, operatorFilter]);
  
  const sortedInterventions = useMemo(() => {
    let sortableItems = [...filteredInterventions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        
        switch(sortConfig.key) {
            case 'priority':
                aValue = priorityOrder[a.priority];
                bValue = priorityOrder[b.priority];
                break;
            case 'status':
                aValue = statusOrder[a.status];
                bValue = statusOrder[b.status];
                break;
            case 'client':
                aValue = clientsMap.get(a.clientId)?.name || '';
                bValue = clientsMap.get(b.clientId)?.name || '';
                break;
             case 'operator':
                aValue = a.assignedOperatorId ? operatorsMap.get(a.assignedOperatorId) || '' : '';
                bValue = b.assignedOperatorId ? operatorsMap.get(b.assignedOperatorId) || '' : '';
                break;
            default:
                aValue = a[sortConfig.key as keyof Intervention];
                bValue = b[sortConfig.key as keyof Intervention];
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
  }, [filteredInterventions, sortConfig, operatorsMap, clientsMap]);

  const requestSort = (key: keyof Intervention | 'client' | 'operator') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof Intervention | 'client' | 'operator') => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  }

  const getStatusBadge = (status: Intervention['status']) => {
    switch (status) {
      case 'Nuovo': return <Badge variant="outline">Nuovo</Badge>;
      case 'In corso': return <Badge className="bg-blue-100 text-blue-800">In corso</Badge>;
      case 'In attesa': return <Badge className="bg-yellow-100 text-yellow-800">In attesa</Badge>;
      case 'Completato': return <Badge className="bg-green-100 text-green-800">Completato</Badge>;
      case 'Da Fatturare': return <Badge className="bg-purple-100 text-purple-800">Da Fatturare</Badge>;
      case 'Fatturato': return <Badge className="bg-gray-100 text-gray-800">Fatturato</Badge>;
      case 'Annullato': return <Badge variant="destructive">Annullato</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: Intervention['priority']) => {
    switch (priority) {
      case 'Critica': return <Badge variant="destructive">Critica</Badge>;
      case 'Alta': return <Badge className="bg-orange-500 text-white">Alta</Badge>;
      case 'Media': return <Badge className="bg-yellow-500 text-white">Media</Badge>;
      case 'Bassa': return <Badge variant="secondary">Bassa</Badge>;
    }
  };

  const tableHeaders = [
    { key: 'title', label: 'Titolo', visible: true, className: 'w-[30%]' },
    { key: 'client', label: 'Cliente', visible: currentUser.role !== 'Client' },
    { key: 'contact', label: 'Contatti Cliente', visible: currentUser.role === 'Admin', className: 'hidden md:table-cell' },
    { key: 'address', label: 'Indirizzo', visible: currentUser.role === 'Admin', className: 'hidden lg:table-cell' },
    { key: 'status', label: 'Stato', visible: true },
    { key: 'priority', label: 'Priorità', visible: true, className: 'hidden sm:table-cell' },
    { key: 'dueDate', label: 'Scadenza', visible: true, className: 'hidden md:table-cell' },
    { key: 'operator', label: 'Operatore', visible: currentUser.role !== 'Operator', className: 'hidden lg:table-cell' },
    { key: 'actions', label: 'Azioni', visible: true, className: 'w-12' },
  ];
  
  const canCreateIntervention = ['Admin', 'Client', 'Operator'].includes(currentUser.role);
  const canDeleteIntervention = ['Admin', 'Client'].includes(currentUser.role);

  return (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-grow">
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
                    <SelectItem value="Nuovo">Nuovo</SelectItem>
                    <SelectItem value="In corso">In corso</SelectItem>
                    <SelectItem value="In attesa">In attesa</SelectItem>
                    <SelectItem value="Completato">Completato</SelectItem>
                    <SelectItem value="Da Fatturare">Da Fatturare</SelectItem>
                    <SelectItem value="Fatturato">Fatturato</SelectItem>
                    <SelectItem value="Annullato">Annullato</SelectItem>
                </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger><SelectValue placeholder="Filtra per priorità" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tutte le priorità</SelectItem>
                    <SelectItem value="Bassa">Bassa</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Critica">Critica</SelectItem>
                </SelectContent>
                </Select>
                {currentUser.role === 'Admin' && (
                    <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger><SelectValue placeholder="Filtra per cliente" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Tutti i clienti</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                )}
            </div>
            { canCreateIntervention &&
                <div className="md:ml-4">
                    <AddInterventionForm
                        clients={clients}
                        operators={operators}
                        onInterventionAdded={handleInterventionAdded}
                        currentUser={currentUser}
                    >
                        <Button className="w-full md:w-auto">
                            <PlusCircle className="mr-2" />
                            Crea Intervento
                        </Button>
                    </AddInterventionForm>
                </div>
            }
      </div>
      <Card className="md:hidden">
        <CardContent className="p-2 space-y-2">
            {sortedInterventions.map((intervention) => {
              const client = clientsMap.get(intervention.clientId);
              return (
                 <div key={intervention.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex justify-between items-start" onClick={() => handleEditClick(intervention as Intervention)}>
                    <div className="flex-1 space-y-1">
                        <p className="font-medium">{intervention.title}</p>
                        {currentUser.role !== 'Client' && client && <p className="text-sm text-muted-foreground">{client.name}</p>}
                        {intervention.dueDate && <p className="text-sm text-muted-foreground">{format(new Date(intervention.dueDate), 'dd MMM yyyy', { locale: it })}</p>}
                        <div className="flex items-center gap-2 pt-1">
                            {getPriorityBadge(intervention.priority)}
                            {getStatusBadge(intervention.status)}
                        </div>
                    </div>
                     <DropdownMenu onOpenChange={(e) => e.stopPropagation()}>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => handleEditClick(intervention as Intervention)}>
                            <Pencil className="mr-2" /> Modifica
                        </DropdownMenuItem>
                        {canDeleteIntervention && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        handleDeleteClick(intervention as Intervention);
                                    }}>
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
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {tableHeaders.filter(h => h.visible).map(header => (
                 <TableHead key={header.key} className={header.className}>
                    {header.key === 'actions' ? (
                        <span className="sr-only">{header.label}</span>
                    ) : (
                        <Button variant="ghost" onClick={() => requestSort(header.key as any)}>
                            {header.label}
                            {getSortIcon(header.key as any)}
                        </Button>
                    )}
                 </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInterventions.map((intervention) => {
              const client = clientsMap.get(intervention.clientId);
              const operatorName = intervention.assignedOperatorId ? operatorsMap.get(intervention.assignedOperatorId) : null;
              return (
                <TableRow key={intervention.id} onClick={() => handleEditClick(intervention as Intervention)} className="cursor-pointer">
                    <TableCell className="font-medium">
                        <div className="flex flex-col">
                            <span>{intervention.title}</span>
                            <span className="text-xs text-muted-foreground">ID: {intervention.id}</span>
                        </div>
                    </TableCell>
                  {(currentUser.role !== 'Client') && 
                    <TableCell>
                        {client ? client.name : '-'}
                    </TableCell>
                   }
                   {currentUser.role === 'Admin' && (
                    <TableCell className="hidden md:table-cell">
                      {client && (
                         <div className="flex flex-col gap-1 text-xs">
                            {client.email && (
                                <a href={`mailto:${client.email}`} onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{client.email}</span>
                                </a>
                            )}
                            {client.phone && (
                                <a href={`tel:${client.phone}`} onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{client.phone}</span>
                                </a>
                            )}
                        </div>
                      )}
                    </TableCell>
                   )}
                   {currentUser.role === 'Admin' && (
                    <TableCell className="hidden lg:table-cell">
                      {client && client.address && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-2 text-xs hover:underline">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{client.address}</span>
                        </a>
                      )}
                    </TableCell>
                   )}
                  <TableCell>{getStatusBadge(intervention.status)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{getPriorityBadge(intervention.priority)}</TableCell>
                  <TableCell className="hidden md:table-cell">{intervention.dueDate ? format(new Date(intervention.dueDate), 'dd MMM yyyy', { locale: it }) : 'N/D'}</TableCell>
                  {currentUser.role !== 'Operator' && <TableCell className="hidden lg:table-cell">{operatorName || 'Non assegnato'}</TableCell>}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                         <DropdownMenuItem onSelect={() => handleEditClick(intervention as Intervention)}>
                             <Pencil className="mr-2" /> Modifica
                         </DropdownMenuItem>
                         {canDeleteIntervention && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        handleDeleteClick(intervention as Intervention);
                                    }}>
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
      <EditInterventionForm
        intervention={selectedIntervention}
        onInterventionUpdated={handleInterventionUpdated}
        clients={clients}
        operators={operators}
        currentUser={currentUser}
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
      />
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
                Questa azione non può essere annullata. L'intervento <b>{interventionToDelete?.title}</b> verrà eliminato definitivamente.
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
