'use client';

import React, { useState, useMemo } from 'react';
import { Intervention, UserRole, User, Client, Equipment } from '@/lib/types';
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
import { getClient, getEquipment, getOperator } from '@/lib/data';
import { Button } from '../ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface InterventionsTableProps {
  interventions: Intervention[];
  currentUser: User;
  clients: Client[];
  operators: User[];
}

const priorityOrder: Record<string, number> = { 'Critica': 4, 'Alta': 3, 'Media': 2, 'Bassa': 1 };
const statusOrder: Record<string, number> = { 'Nuovo': 1, 'In corso': 2, 'In attesa': 3, 'Completato': 4, 'Annullato': 5 };

export function InterventionsTable({ interventions, currentUser, clients, operators }: InterventionsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Intervention | 'client' | 'operator'; direction: 'ascending' | 'descending' } | null>({ key: 'dueDate', direction: 'ascending' });

  const roleBasedInterventions = useMemo(() => {
    if (currentUser.role === 'Admin') return interventions;
    if (currentUser.role === 'Operator') return interventions.filter(i => i.assignedOperatorId === currentUser.id);
    if (currentUser.role === 'Client') {
        const client = clients.find(c => c.name === currentUser.name);
        return client ? interventions.filter(i => i.clientId === client.id) : [];
    }
    return [];
  }, [interventions, currentUser, clients]);

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
                aValue = getClient(a.clientId)?.name || '';
                bValue = getClient(b.clientId)?.name || '';
                break;
             case 'operator':
                aValue = a.assignedOperatorId ? getOperator(a.assignedOperatorId)?.name || '' : '';
                bValue = b.assignedOperatorId ? getOperator(b.assignedOperatorId)?.name || '' : '';
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
  }, [filteredInterventions, sortConfig]);

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
    { key: 'title', label: 'Titolo', visible: true },
    { key: 'client', label: 'Cliente', visible: currentUser.role !== 'Client' },
    { key: 'status', label: 'Stato', visible: true },
    { key: 'priority', label: 'Priorità', visible: true },
    { key: 'dueDate', label: 'Scadenza', visible: true },
    { key: 'operator', label: 'Operatore', visible: currentUser.role !== 'Operator' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Input
          placeholder="Cerca per titolo o ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="lg:col-span-2"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Filtra per stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="Nuovo">Nuovo</SelectItem>
            <SelectItem value="In corso">In corso</SelectItem>
            <SelectItem value="In attesa">In attesa</SelectItem>
            <SelectItem value="Completato">Completato</SelectItem>
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
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {tableHeaders.filter(h => h.visible).map(header => (
                 <TableHead key={header.key}>
                    <Button variant="ghost" onClick={() => requestSort(header.key as any)}>
                        {header.label}
                        {getSortIcon(header.key as any)}
                    </Button>
                 </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInterventions.map((intervention) => {
              const client = getClient(intervention.clientId);
              const operator = intervention.assignedOperatorId ? getOperator(intervention.assignedOperatorId) : null;
              return (
                <TableRow key={intervention.id}>
                    <TableCell className="font-medium">
                        <div className="flex flex-col">
                            <span>{intervention.title}</span>
                            <span className="text-xs text-muted-foreground">ID: {intervention.id}</span>
                        </div>
                    </TableCell>
                  {currentUser.role !== 'Client' && <TableCell>{client?.name}</TableCell>}
                  <TableCell>{getStatusBadge(intervention.status)}</TableCell>
                  <TableCell>{getPriorityBadge(intervention.priority)}</TableCell>
                  <TableCell>{format(new Date(intervention.dueDate), 'dd MMM yyyy', { locale: it })}</TableCell>
                  {currentUser.role !== 'Operator' && <TableCell>{operator?.name || 'Non assegnato'}</TableCell>}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
