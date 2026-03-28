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
import { ChevronDown, ChevronUp, MoreHorizontal, PlusCircle, Pencil, Trash2, Mail, Phone, MapPin, Send, Star, Archive, List, LayoutGrid, Loader, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn, createWhatsAppLink } from '@/lib/utils';
import { WhatsAppIcon } from '../icons/whatsapp-icon';
import { useRouter, usePathname } from 'next/navigation';
import { Checkbox } from '../ui/checkbox';
import { triggerInterventionReminderEmail, createClientAutologinUrl } from '@/app/actions';


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
  initialViewMode?: 'table' | 'grid';
  initialSearchTerm?: string;
  initialClientFilter?: string;
}

const priorityOrder: Record<string, number> = { 'Critica': 4, 'Alta': 3, 'Media': 2, 'Bassa': 1 };
const statusOrder: Record<string, number> = { 'Nuovo': 1, 'In corso': 2, 'Archiviato': 3, 'Completato': 4, 'Da Fatturare': 5, 'Fatturato': 6, 'Annullato': 7 };

const isDueSoon = (dueDate: string | null | undefined): boolean => {
    if (!dueDate) return false;
    const now = new Date();
    const dueDateObj = new Date(dueDate);
    const twoDaysFromNow = addDays(now, 2);
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
    initialAssignedFilter = false,
    initialViewMode = 'table',
    initialSearchTerm = '',
    initialClientFilter = 'all'
}: InterventionsTableProps) {
  const { toast } = useToast();
  const { openModal, closeModal } = useInterventionModal();
  const router = useRouter();
  const pathname = usePathname();
  
  const [interventions, setInterventions] = useState(initialInterventions);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [priorityFilter, setPriorityFilter] = useState(initialPriorityFilter);
  const [clientFilter, setClientFilter] = useState(initialClientFilter);
  const [operatorFilter, setOperatorFilter] = useState(initialOperatorFilter);
  const [assignedFilter, setAssignedFilter] = useState(initialAssignedFilter);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(initialViewMode);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Intervention | 'client' | 'operator'; direction: 'ascending' | 'descending' } | null>({ key: 'createdAt', direction: 'descending' });
  
  const [clientsMap, setClientsMap] = useState<Map<string, User>>(new Map());
  const [operatorsMap, setOperatorsMap] = useState<Map<string, string>>(new Map());

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [interventionToDelete, setInterventionToDelete] = useState<Intervention | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState<string | null>(null);
  
  useEffect(() => {
    setInterventions(initialInterventions);
  }, [initialInterventions]);

  useEffect(() => {
    const opMap = new Map<string, string>();
    operators.forEach(op => opMap.set(op.id, op.name));
    setOperatorsMap(opMap);

    const cliMap = new Map<string, User>();
    initialClients.forEach(c => cliMap.set(c.id, c));
    setClientsMap(cliMap);
  }, [operators, initialClients]);
  
  useEffect(() => {
    if (pathname === '/dashboard/interventions') {
        const params = new URLSearchParams();
        if (statusFilter !== 'active') params.set('status', statusFilter);
        if (priorityFilter !== 'all') params.set('priority', priorityFilter);
        if (operatorFilter !== 'all') params.set('operator', operatorFilter);
        if (clientFilter !== 'all') params.set('client', clientFilter);
        if (searchTerm !== '') params.set('search', searchTerm);
        if (assignedFilter) params.set('assigned', 'true');
        if (viewMode !== 'table') params.set('view', viewMode);
        
        const queryString = params.toString();
        router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    }
  }, [statusFilter, priorityFilter, operatorFilter, clientFilter, searchTerm, assignedFilter, viewMode, router, pathname]);

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
  
  const handleArchiveClick = async (intervention: Intervention) => {
    if (currentUser.role === 'Admin' || currentUser.role === 'Creator') {
        try {
            const updated = await updateIntervention(intervention.id, { status: 'Archiviato' }, currentUser);
            if (updated) {
                onInterventionChange();
                closeModal(); 
                toast({
                    title: 'Intervento archiviato',
                    description: `L'intervento "${intervention.title}" è stato spostato in archivio.`,
                });
            }
        } catch (error) {
            console.error("Archive failed:", error);
            toast({
                variant: 'destructive',
                title: 'Errore',
                description: "Impossibile archiviare l'intervento.",
            });
        }
    }
  }

  const handleSendReminder = async (intervention: Intervention) => {
    if (intervention.assignedOperatorIds.length === 0) {
        toast({ variant: 'destructive', title: 'Nessun Operatore', description: "Assegna almeno un operatore prima di inviare un sollecito." });
        return;
    }

    setIsSendingReminder(intervention.id);
    try {
        const client = clientsMap.get(intervention.clientId);
        
        for (const opId of intervention.assignedOperatorIds) {
            const operator = operators.find(o => o.id === opId);
            if (!operator || !operator.email) continue;

            const loginResult = await createClientAutologinUrl(opId);
            if (!loginResult.success || !loginResult.url) continue;

            const reminderUrl = `${loginResult.url}&interventionId=${intervention.id}`;

            await triggerInterventionReminderEmail({
                recipientEmail: operator.email,
                operatorName: operator.name,
                interventionId: intervention.id,
                interventionTitle: intervention.title,
                clientName: client?.name || 'N/D',
                autologinUrl: reminderUrl,
                resendConfig: {
                    apiKey: 'placeholder', 
                    from: 'placeholder',
                }
            });
        }
        
        toast({ title: 'Sollecito Inviato', description: 'Email di promemoria inviata agli operatori assegnati.' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile inviare il sollecito.' });
    } finally {
        setIsSendingReminder(null);
    }
  };


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
        filtered = filtered.filter(i => i.assignedOperatorIds?.includes(operatorFilter));
    }
    
    if (assignedFilter) {
      filtered = filtered.filter(i => i.assignedOperatorIds && i.assignedOperatorIds.length > 0);
    }

    return filtered;
  }, [roleBasedInterventions, searchTerm, statusFilter, priorityFilter, clientFilter, operatorFilter, assignedFilter, clientsMap]);
  
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
             case 'isFeatured':
                aValue = a.isFeatured ? 1 : 0;
                bValue = b.isFeatured ? 1 : 0;
                break;
            default:
                aValue = a[sortConfig.key as keyof Intervention] ?? '';
                bValue = b[sortConfig.key as keyof Intervention] ?? '';
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
  }, [filteredInterventions, sortConfig, clientsMap]);

  const totalToInvoice = useMemo(() => {
    return filteredInterventions
        .filter(i => i.status === 'Da Fatturare')
        .reduce((acc, i) => acc + (i.cost || 0), 0);
  }, [filteredInterventions]);

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

  const renderStatus = (intervention: Intervention) => {
    const badge = getStatusBadge(intervention.status);
    const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Creator';
    if (intervention.status === 'Da Fatturare' && isAdmin && intervention.cost !== null && intervention.cost !== undefined) {
        return (
            <div className="flex flex-col items-start gap-0.5">
                {badge}
                <span className="text-[10px] font-bold text-purple-700 whitespace-nowrap">€ {intervention.cost.toFixed(2)}</span>
            </div>
        );
    }
    return badge;
  };

  const getPriorityBadge = (priority: Intervention['priority']) => {
    switch (priority) {
      case 'Critica': return <Badge variant="destructive">Critica</Badge>;
      case 'Alta': return <Badge className="bg-orange-500 text-white">Alta</Badge>;
      case 'Media': return <Badge className="bg-yellow-500 text-white">Media</Badge>;
      case 'Bassa': return <Badge variant="secondary">Bassa</Badge>;
    }
  };

  const getPostItColor = (priority: string) => {
    switch (priority) {
        case 'Critica': return 'bg-red-100 border-red-300 dark:bg-red-900/40 dark:border-red-800';
        case 'Alta': return 'bg-orange-100 border-orange-300 dark:bg-orange-900/40 dark:border-orange-800';
        case 'Media': return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/40 dark:border-yellow-800';
        case 'Bassa': return 'bg-green-100 border-green-300 dark:bg-green-900/40 dark:border-green-800';
        default: return 'bg-card';
    }
  }

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
  const canArchiveIntervention = currentUser.role === 'Admin' || currentUser.role === 'Creator';
  
  const isAdminOrCreator = currentUser.role === 'Admin' || currentUser.role === 'Creator';

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
                    {Array.from(clientsMap.values()).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                )}
            </div>
            <div className="flex items-center gap-2 border rounded-md p-1 bg-muted/50 self-start md:self-center">
                <Button 
                    variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('table')}
                    className="h-8 px-2"
                >
                    <List className="h-4 w-4 mr-1" /> Tabella
                </Button>
                <Button 
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('grid')}
                    className="h-8 px-2"
                >
                    <LayoutGrid className="h-4 w-4 mr-1" /> Post-it
                </Button>
            </div>
      </div>

      {isAdminOrCreator && totalToInvoice > 0 && (
          <div className="flex justify-end">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-tight">Valore da Fatturare (Filtrato):</span>
                  <span className="text-sm font-black text-purple-700 dark:text-purple-400">€ {totalToInvoice.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              </div>
          </div>
      )}

      {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedInterventions.map((intervention) => {
                  const client = clientsMap.get(intervention.clientId);
                  const urgent = isDueSoon(intervention.dueDate);
                  return (
                      <Card 
                        key={intervention.id} 
                        className={cn(
                            "relative overflow-hidden cursor-pointer hover:shadow-md transition-all h-full min-h-[200px] flex flex-col border-t-4", 
                            getPostItColor(intervention.priority)
                        )}
                        onClick={() => handleEditClick(intervention as Intervention)}
                      >
                          <CardHeader className="p-4 pb-2 space-y-0">
                              <div className="flex justify-between items-start">
                                  <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                                          {client?.name || 'Cliente Sconosciuto'}
                                      </p>
                                      <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight">
                                          {intervention.title}
                                      </CardTitle>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={e => e.stopPropagation()}>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClick(intervention as Intervention); }}>
                                            <Pencil className="mr-2" /> Modifica
                                        </DropdownMenuItem>
                                        {currentUser.role === 'Admin' && (
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendReminder(intervention as Intervention); }} disabled={isSendingReminder === intervention.id}>
                                                {isSendingReminder === intervention.id ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                                Sollecita
                                            </DropdownMenuItem>
                                        )}
                                        {canArchiveIntervention && (
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveClick(intervention as Intervention); }}>
                                                <Archive className="mr-2" /> Archivia
                                            </DropdownMenuItem>
                                        )}
                                        {canDeleteIntervention && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(intervention as Intervention); }}>
                                                    <Trash2 className="mr-2" /> Elimina
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                              </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between">
                              <div className="space-y-2 mt-2">
                                  <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] text-muted-foreground font-mono">ID: {intervention.id}</span>
                                      {renderStatus(intervention as Intervention)}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                      {intervention.dueDate ? (
                                          <p className={cn("flex items-center gap-1", urgent && "text-red-600 font-bold")}>
                                              <ChevronDown className="h-3 w-3" /> Scade: {format(new Date(intervention.dueDate), 'dd/MM/yy HH:mm')}
                                          </p>
                                      ) : (
                                          <p>Nessuna scadenza</p>
                                      )}
                                  </div>
                              </div>
                              <div className="mt-4 flex items-center justify-between">
                                  {getPriorityBadge(intervention.priority)}
                                  {intervention.isFeatured && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                              </div>
                          </CardContent>
                      </Card>
                  )
              })}
          </div>
      ) : (
        <>
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
                                    {renderStatus(intervention as Intervention)}
                                </div>
                            </div>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}><MoreHorizontal /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClick(intervention as Intervention); }}>
                                    <Pencil className="mr-2" /> Modifica
                                </DropdownMenuItem>
                                {currentUser.role === 'Admin' && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendReminder(intervention as Intervention); }} disabled={isSendingReminder === intervention.id}>
                                        {isSendingReminder === intervention.id ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Sollecita
                                    </DropdownMenuItem>
                                )}
                                {canArchiveIntervention && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveClick(intervention as Intervention); }}>
                                        <Archive className="mr-2" /> Archivia
                                    </DropdownMenuItem>
                                )}
                                {canDeleteIntervention && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(intervention as Intervention); }}>
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
                    const operatorNames = (intervention.assignedOperatorIds || []).map(id => operatorsMap.get(id)).filter(Boolean).join(', ');
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
                        <TableCell className="cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>{renderStatus(intervention as Intervention)}</TableCell>
                        <TableCell className="hidden sm:table-cell cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>{getPriorityBadge(intervention.priority)}</TableCell>
                        <TableCell className="hidden md:table-cell cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>{intervention.createdAt ? format(new Date(intervention.createdAt), 'dd/MM/yy HH:mm', { locale: it }) : 'N/D'}</TableCell>
                        <TableCell className={cn("hidden md:table-cell cursor-pointer", urgent && "font-bold")} onClick={() => handleEditClick(intervention as Intervention)}>{intervention.dueDate ? format(new Date(intervention.dueDate), 'dd/MM/yy HH:mm', { locale: it }) : 'N/D'}</TableCell>
                        {currentUser.role !== 'Operator' && <TableCell className="hidden lg:table-cell cursor-pointer" onClick={() => handleEditClick(intervention as Intervention)}>{operatorNames || 'Non assegnato'}</TableCell>}
                        <TableCell className="text-right">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}><MoreHorizontal /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClick(intervention as Intervention); }}>
                                    <Pencil className="mr-2" /> Modifica
                                </DropdownMenuItem>
                                {currentUser.role === 'Admin' && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendReminder(intervention as Intervention); }} disabled={isSendingReminder === intervention.id}>
                                        {isSendingReminder === intervention.id ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Sollecita
                                    </DropdownMenuItem>
                                )}
                                {canArchiveIntervention && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveClick(intervention as Intervention); }}>
                                        <Archive className="mr-2" /> Archivia
                                    </DropdownMenuItem>
                                )}
                                {canDeleteIntervention && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(intervention as Intervention); }}>
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
        </>
      )}
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
