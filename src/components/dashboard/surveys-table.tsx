
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Survey, User, Client, SurveyStatus } from '@/lib/types';
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
import { deleteSurvey } from '@/lib/data';
import { Button } from '../ui/button';
import { MoreHorizontal, PlusCircle, Pencil, Trash2, MapPin, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { AddSurveyForm } from './add-survey-form';
import { EditSurveyForm } from './edit-survey-form';

interface SurveysTableProps {
  surveys: Survey[];
  currentUser: User;
  clients: Client[];
  operators: User[];
  onSurveyChange: () => void;
}

export function SurveysTable({ surveys: initialSurveys, currentUser, clients, operators, onSurveyChange }: SurveysTableProps) {
  const { toast } = useToast();
  const [surveys, setSurveys] = useState(initialSurveys);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [clientsMap, setClientsMap] = useState<Map<string, Client>>(new Map());
  const [operatorsMap, setOperatorsMap] = useState<Map<string, string>>(new Map());

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);

  useEffect(() => {
    setSurveys(initialSurveys);
  }, [initialSurveys]);

  useEffect(() => {
    const opMap = new Map<string, string>();
    operators.forEach(op => opMap.set(op.id, op.name));
    setOperatorsMap(opMap);

    const cliMap = new Map<string, Client>();
    clients.forEach(c => cliMap.set(c.id, c));
    setClientsMap(cliMap);
  }, [operators, clients]);

  const handleEditClick = (survey: Survey) => {
    setSelectedSurvey(survey);
    setIsEditModalOpen(true);
  }
  
  const handleDeleteClick = (survey: Survey) => {
    setSurveyToDelete(survey);
    setIsDeleteDialogOpen(true);
  }

  const confirmDelete = async () => {
      if (!surveyToDelete) return;
      const success = await deleteSurvey(surveyToDelete.id);
      if (success) {
          onSurveyChange();
          toast({
              title: 'Sopralluogo eliminato',
              description: `Il sopralluogo "${surveyToDelete.title}" è stato eliminato.`,
          });
      } else {
           toast({
              variant: 'destructive',
              title: 'Errore',
              description: "Impossibile eliminare il sopralluogo.",
          });
      }
      setIsDeleteDialogOpen(false);
      setSurveyToDelete(null);
  }

  const filteredSurveys = useMemo(() => {
    let filtered = surveys;

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clientsMap.get(s.clientId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    return filtered;
  }, [surveys, searchTerm, statusFilter, clientsMap]);
  
  const getStatusBadge = (status: SurveyStatus) => {
    switch (status) {
      case 'Pianificato': return <Badge className="bg-blue-100 text-blue-800">Pianificato</Badge>;
      case 'Eseguito': return <Badge className="bg-green-100 text-green-800">Eseguito</Badge>;
      case 'Annullato': return <Badge variant="destructive">Annullato</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow max-w-lg">
                <Input
                placeholder="Cerca per titolo, cliente, indirizzo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:col-span-2"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="Filtra per stato" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tutti gli stati</SelectItem>
                        <SelectItem value="Pianificato">Pianificato</SelectItem>
                        <SelectItem value="Eseguito">Eseguito</SelectItem>
                        <SelectItem value="Annullato">Annullato</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            { currentUser.role === 'Admin' &&
                <div className="md:ml-4">
                    <AddSurveyForm
                        clients={clients}
                        operators={operators}
                        onSurveyAdded={onSurveyChange}
                    >
                        <Button className="w-full md:w-auto">
                            <PlusCircle className="mr-2" />
                            Crea Sopralluogo
                        </Button>
                    </AddSurveyForm>
                </div>
            }
      </div>
      <Card className="md:hidden">
        <CardContent className="p-2 space-y-2">
            {filteredSurveys.map((survey) => {
              const client = clientsMap.get(survey.clientId);
              return (
                 <div key={survey.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex justify-between items-start" onClick={() => handleEditClick(survey)}>
                    <div className="flex-1 space-y-1">
                        <p className="font-medium">{survey.title}</p>
                        <p className="text-sm text-muted-foreground">{client?.name}</p>
                        <p className="text-sm text-muted-foreground">{survey.address}</p>
                        <p className="text-sm text-muted-foreground">Data: {format(new Date(survey.date), 'dd/MM/yy HH:mm', { locale: it })}</p>
                        <div className="flex items-center gap-2 pt-1">
                            {getStatusBadge(survey.status)}
                        </div>
                    </div>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => handleEditClick(survey)}>
                            <Pencil className="mr-2" /> Modifica
                        </DropdownMenuItem>
                        {currentUser.role === 'Admin' && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteClick(survey);
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
              <TableHead className="w-[30%]">Titolo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Indirizzo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Operatore</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="w-12 text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSurveys.map((survey) => {
              const client = clientsMap.get(survey.clientId);
              const operatorName = survey.assignedOperatorId ? operatorsMap.get(survey.assignedOperatorId) : null;
              return (
                <TableRow key={survey.id} onClick={() => handleEditClick(survey)} className="cursor-pointer">
                    <TableCell className="font-medium">{survey.title}</TableCell>
                    <TableCell>
                        {client ? (
                            <div>
                                <span>{client.name}</span>
                                {client.phone && (
                                    <a href={`tel:${client.phone}`} onClick={e=>e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:underline">
                                        <Phone className="h-3 w-3" /> {client.phone}
                                    </a>
                                )}
                            </div>
                        ) : (
                            <span>-</span>
                        )}
                    </TableCell>
                    <TableCell>
                         <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(survey.address)}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-1.5 hover:underline">
                            <MapPin className="h-4 w-4 shrink-0" /> <span>{survey.address}</span>
                        </a>
                    </TableCell>
                    <TableCell>{format(new Date(survey.date), 'dd/MM/yy HH:mm', { locale: it })}</TableCell>
                    <TableCell>{operatorName || 'Non assegnato'}</TableCell>
                    <TableCell>{getStatusBadge(survey.status)}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => handleEditClick(survey)}>
                                <Pencil className="mr-2" /> Modifica
                            </DropdownMenuItem>
                            {currentUser.role === 'Admin' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                        onSelect={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteClick(survey);
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
      <EditSurveyForm
        survey={selectedSurvey}
        onSurveyUpdated={onSurveyChange}
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
                Questa azione non può essere annullata. Il sopralluogo <b>{surveyToDelete?.title}</b> verrà eliminato definitivamente.
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
