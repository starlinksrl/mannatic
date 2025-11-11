

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Intervention, UserRole, User } from '@/lib/types';
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
import { format, isBefore, addDays, startOfToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { deleteIntervention, updateIntervention } from '@/lib/data';
import { Button } from '../ui/button';
import { ChevronDown, ChevronUp, MoreHorizontal, PlusCircle, Pencil, Trash2, Mail, Phone, MapPin, Send, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AddInterventionForm } from './add-intervention-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
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
import { useInterventionModal } from '@/contexts/intervention-modal-context';
import { cn } from '@/lib/utils';
import { createWhatsAppLink } from '@/lib/utils';
import { WhatsAppIcon } from '../icons/whatsapp-icon';
import { useRouter, useSearchParams } from 'next/navigation';
import { Checkbox } from '../ui/checkbox';


interface InterventionsTableProps {
  interventions: Intervention[];
  currentUser: User;
  clients: User[];
  operators: User[];
  onInterventionChange: () => void;
  initialStatusFilter?: string;
  initialPriorityFilter?: string;
  initialOperatorFilter?: string;
  initialAssignedFilter?: boolean;
}

const priorityOrder: Record<string, number> = { 'Critica': 4, 'Alta': 3, 'Media': 2, 'Bassa': 1 };
const statusOrder: Record<string, number> = { 'Nuovo': 1, 'In corso': 2, 'Archiviato': 3, 'Completato': 4, 'Da Fatturare': 5, 'Fatturato': 6, 'Annullato': 7 };

const isDueSoon = (dueDate: string | null | undefined): boolean => {
    if (!dueDate) return false;
    const now = new Date();
    const dueDateObj = new Date(dueDate);
    const twoDaysFromNow = addDays(now, 2);
    // is due soon if it's before 2 days from now AND it's after or on today
    return isBefore(dueDateObj, twoDaysFromNow) && isBefore(startOfToday(), addDays(dueDateObj, 1));
};

export function InterventionsTable({ 
    interventions: initialInterventions, 
    currentUser, 
    clients: initialClients, 
    operators, 
    onInterventionChange, 
    initialStatusFilter = 'active', 
    initialPriorityFilter = 'all',
    initialOperatorFilter = 'all',
    initialAssignedFilter = false
}: InterventionsTableProps) {
  const { toast } = useToast();
  const { openModal } = useInterventionModal();
  const router = useRouter();
  
  const [interventions, setInterventions] = useState(initialInterventions);
  const [clients, setClients] = useState(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [priorityFilter, setPriorityFilter] = useState(initialPriorityFilter);
  const [clientFilter, setClientFilter] = useState('all');
  const [operatorFilter, setOperatorFilter] = useState(initialOperatorFilter);
  const [assignedFilter, setAssignedFilter] = useState(initialAssignedFilter);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Intervention | 'client' | 'operator' | 'default'; direction: 'ascending' | 'descending' } | null>({ key: 'default', direction: 'ascending' });
  
  const [clientsMap, setClientsMap] = useState<Map<string, User>>(new Map());
  const [operatorsMap, setOperatorsMap] = useState<Map<string, string>>(new Map());

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [interventionToDelete, setInterventionToDelete] = useState<Intervention | null>(null);
  
  useEffect(() => {
    setInterventions(initialInterventions);
  }, [initialInterventions]);

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  useEffect(() => {
    const opMap = new Map<string, string>();
    operators.forEach(op => opMap.set(op.id, op.name));
    setOperatorsMap(opMap);

    const cliMap = new Map<string, User>();
    clients.forEach(c => cliMap.set(c.id, c));
    setClientsMap(cliMap);
  }, [operators, clients]);
  
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'active') params.set('status', statusFilter);
    if (priorityFilter !== 'all') params.set('priority', priorityFilter);
    if (operatorFilter !== 'all') params.set('operator', operatorFilter);
    if (assignedFilter) params.set('assigned', 'true');
    // Using replace to not add to browser history
    router.replace(`/dashboard/interventions?${params.toString()}`);
  }, [statusFilter, priorityFilter, operatorFilter, assignedFilter, router]);

  const handleEditClick = (intervention: Intervention) => {
    openModal(intervention);
  }

  const handleDeleteClick = (intervention: Intervention) => {
    setInterventionToDelete(intervention);
    setIsDeleteDialogOpen(true);
  }

  const confirmDelete = async () => {
      if (!interventionToDelete) return;
      const success = await deleteIntervention(interventionToDelete.id);
      if (success) {
          onInterventionChange();
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

  const handleFeatureToggle = async (intervention: Intervention) => {
    const newFeaturedState = !intervention.isFeatured;
    const updatedIntervention = await updateIntervention(intervention.id, { isFeatured: newFeaturedState }, currentUser);
    if (updatedIntervention) {
        onInterventionChange();
        toast({
            title: newFeaturedState ? 'Intervento Evidenziato' : 'Intervento non più evidenziato',
            description: `L'intervento "${intervention.title}" è stato aggiornato.`
        })
    } else {
        toast({ variant: 'destructive', title: 'Errore', description: "Impossibile aggiornare l'intervento." });
    }
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
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(i => {
        const clientName = clientsMap.get(i.clientId)?.name.toLowerCase() || '';
        return i.title.toLowerCase().includes(lowercasedSearchTerm) ||
               i.id.toLowerCase().includes(lowercasedSearchTerm) ||
               clientName.includes(lowercasedSearchTerm);
      });
    }
    
    const statuses = statusFilter.split(',');
    if (statusFilter === 'active') {
        const activeStatuses = ['Nuovo', 'In corso'];
        filtered = filtered.filter(i => activeStatuses.includes(i.status));
    } else if (statuses[0] !== 'all') {
      filtered = filtered.filter(i => statuses.includes(i.status));
    }
    
    const priorities = priorityFilter.split(',');
    if (priorities[0] !== 'all') {
        filtered = filtered.filter(i => priorities.includes(i.priority));
    }

    if (clientFilter !== 'all') {
        filtered = filtered.filter(i => i.clientId === clientFilter);
    }
    if (operatorFilter !== 'all') {
        filtered = filtered.filter(i => i.assignedOperatorId === operatorFilter);
    }
    
    if (assignedFilter) {
      filtered = filtered.filter(i => !!i.assignedOperatorId);
    }

    return filtered;
  }, [roleBasedInterventions, searchTerm, statusFilter, priorityFilter, clientFilter, operatorFilter, assignedFilter, currentUser.role, clientsMap]);
  
  const sortedInterventions = useMemo(() => {
    let sortableItems = [...filteredInterventions];
    
    // Custom sort function
    const customSort = (a: Intervention, b: Intervention) => {
      if (sortConfig) {
          let aValue, bValue;
          switch(sortConfig.key) {
              case 'isFeatured':
                  aValue = a.isFeatured ? 1 : 0;
                  bValue = b.isFeatured ? 1 : 0;
                  return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
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
               case 'default':
                   const priorityComparison = priorityOrder[b.priority] - priorityOrder[a.priority];
                   if (priorityComparison !== 0) return priorityComparison;
                   return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              default:
                  aValue = a[sortConfig.key as keyof Intervention];
                  bValue = b[sortConfig.key as keyof Intervention];
          }

          if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    };
    
    // Separate urgent interventions
    const dueSoonItems = sortableItems.filter(i => isDueSoon(i.dueDate));
    const otherItems = sortableItems.filter(i => !isDueSoon(i.dueDate));
    
    // Sort each group individually
    dueSoonItems.sort(customSort);
    otherItems.sort(customSort);

    // Combine them
    return [...dueSoonItems, ...otherItems];
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
      case 'Archiviato': return <Badge className="bg-yellow-100 text-yellow-800">Archiviato</Badge>;
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
    { key: 'isFeatured', label: '★', visible: currentUser.role === 'Admin' || currentUser.role === 'Creator', className: 'w-12'},
    { key: 'client', label: 'Cliente / Titolo', visible: currentUser.role !== 'Client', className: 'w-[30%]' },
    { key: 'title', label: 'Titolo', visible: currentUser.role === 'Client' },
    { key: 'contact', label: 'Contatti Cliente', visible: currentUser.role === 'Admin', className: 'hidden lg:table-cell' },
    { key: 'address', label: 'Indirizzo', visible: currentUser.role === 'Admin', className: 'hidden xl:table-cell' },
    { key: 'status', label: 'Stato', visible: true },
    { key: 'priority', label: 'Priorità', visible: true, className: 'hidden sm:table-cell' },
    { key: 'createdAt', label: 'Creazione', visible: true, className: 'hidden md:table-cell' },
    { key: 'dueDate', label: 'Scadenza', visible: true, className: 'hidden md:table-cell' },
    { key: 'operator', label: 'Operatore', visible: currentUser.role !== 'Operator', className: 'hidden lg:table-cell' },
    { key: 'actions', label: 'Azioni', visible: true, className: 'w-12' },
  ];
  
  const canDeleteIntervention = ['Admin', 'Client', 'Creator'].includes(currentUser.role);
  
  return (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-grow">
                <Input
                placeholder="Cerca per titolo, ID o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:col-span-2"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Filtra per stato" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="active">Attivi</SelectItem>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="Nuovo">Nuovo</SelectItem>
                    <SelectItem value="In corso">In corso</SelectItem>
                    <SelectItem value="Archiviato">Archiviato</SelectItem>
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
                 {currentUser.role === 'Admin' && (
                    <Select value={operatorFilter} onValueChange={setOperatorFilter}>
                    <SelectTrigger><SelectValue placeholder="Filtra per operatore" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Tutti gli operatori</SelectItem>
                    {operators.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                )}
            </div>
      </div>
      <Card className="lg:hidden">
        <CardContent className="p-2 space-y-2">
            {sortedInterventions.map((intervention) => {
              const client = clientsMap.get(intervention.clientId);
              const urgent = isDueSoon(intervention.dueDate);
              return (
                 <div key={intervention.id} className={cn("p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex justify-between items-start", urgent && "bg-amber-100 dark:bg-amber-900/50")}>
                    <div className="flex-1 space-y-2 pr-4 break-words cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>
                        {currentUser.role !== 'Client' && client && (
                          <div className="space-y-1 text-sm">
                            <p className="font-medium break-words">{client.name}</p>
                             <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                {client.phone && (
                                    <div className="flex items-center gap-2">
                                        <a href={`tel:${client.phone}`} onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span>{client.phone}</span>
                                        </a>
                                        <a href={createWhatsAppLink(client.phone)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="hover:text-green-500">
                                            <WhatsAppIcon className="h-4 w-4" />
                                        </a>
                                    </div>
                                )}
                                 {client.address && (
                                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>{client.address}</span>
                                    </a>
                                 )}
                             </div>
                          </div>
                        )}
                        <p className="font-semibold break-words">{intervention.title}</p>
                        {intervention.createdAt && <p className="text-sm text-muted-foreground break-words">Creato: {format(new Date(intervention.createdAt), 'dd/MM/yy HH:mm', { locale: it })}</p>}
                        {intervention.dueDate && <p className={cn("text-sm text-muted-foreground break-words", urgent && "font-bold text-amber-700 dark:text-amber-300")}>Scadenza: {format(new Date(intervention.dueDate), 'dd/MM/yy HH:mm', { locale: it })}</p>}
                        <div className="flex items-center gap-2 pt-1">
                            {getPriorityBadge(intervention.priority)}
                            {getStatusBadge(intervention.status)}
                        </div>
                    </div>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
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
                                    onSelect={() => handleDeleteClick(intervention as Intervention)}>
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
              {tableHeaders.filter(h => h.visible).map(header => (
                 <TableHead key={header.key} className={header.className}>
                    {header.key === 'actions' ? (
                        <span className="sr-only">{header.label}</span>
                    ) : header.key === 'isFeatured' ? (
                         <Button variant="ghost" size="icon" onClick={() => requestSort('isFeatured')}>
                            <Star className="h-4 w-4" />
                            {getSortIcon('isFeatured')}
                         </Button>
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
              const urgent = isDueSoon(intervention.dueDate);
              return (
                <TableRow key={intervention.id} className={cn(urgent && "bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-100/80 dark:hover:bg-amber-900/60")}>
                  {(currentUser.role === 'Admin' || currentUser.role === 'Creator') && (
                    <TableCell>
                        <Checkbox
                            checked={intervention.isFeatured}
                            onCheckedChange={() => handleFeatureToggle(intervention)}
                            aria-label="Evidenziato"
                        />
                    </TableCell>
                  )}
                  {currentUser.role !== 'Client' ? (
                    <TableCell className="font-medium cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>
                        <div className="flex flex-col break-words">
                            <span className="break-words font-semibold">{client ? client.name : '-'}</span>
                            <span className="text-xs text-muted-foreground">{intervention.title}</span>
                            <span className="text-xs text-muted-foreground">ID: {intervention.id}</span>
                        </div>
                    </TableCell>
                  ) : (
                     <TableCell className="font-medium cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>
                        <div className="flex flex-col break-words">
                            <span className="break-words">{intervention.title}</span>
                            <span className="text-xs text-muted-foreground">ID: {intervention.id}</span>
                        </div>
                    </TableCell>
                  )}
                   {currentUser.role === 'Admin' && (
                    <TableCell className="hidden lg:table-cell cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>
                      {client && (
                         <div className="flex flex-col gap-1 text-xs">
                            {client.email && (
                                <a href={`mailto:${client.email}`} onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{client.email}</span>
                                </a>
                            )}
                            {client.phone && (
                                <div className="flex items-center gap-2">
                                    <a href={`tel:${client.phone}`} onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span>{client.phone}</span>
                                    </a>
                                     <a href={createWhatsAppLink(client.phone)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="hover:text-green-500">
                                        <WhatsAppIcon className="h-4 w-4" />
                                     </a>
                                </div>
                            )}
                        </div>
                      )}
                    </TableCell>
                   )}
                   {currentUser.role === 'Admin' && (
                    <TableCell className="hidden xl:table-cell cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>
                      {client && client.address && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-2 text-xs hover:underline">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{client.address}</span>
                        </a>
                      )}
                    </TableCell>
                   )}
                  <TableCell className="cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>{getStatusBadge(intervention.status)}</TableCell>
                  <TableCell className="hidden sm:table-cell cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>{getPriorityBadge(intervention.priority)}</TableCell>
                  <TableCell className="hidden md:table-cell cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>{intervention.createdAt ? format(new Date(intervention.createdAt), 'dd/MM/yy HH:mm', { locale: it }) : 'N/D'}</TableCell>
                  <TableCell className={cn("hidden md:table-cell cursor-pointer", urgent && "font-bold")} onClick={() => handleEditClick(intervention as Intervention)}>{intervention.dueDate ? format(new Date(intervention.dueDate), 'dd/MM/yy HH:mm', { locale: it }) : 'N/D'}</TableCell>
                  {currentUser.role !== 'Operator' && <TableCell className="hidden lg:table-cell cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>{operatorName || 'Non assegnato'}</TableCell>}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
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
                                    onSelect={() => handleDeleteClick(intervention as Intervention)}>
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

    
