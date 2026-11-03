
'use client';

import React, { useState, useMemo } from 'react';
import { User } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MoreHorizontal, Pencil, Trash2, Mail, Phone, MapPin, KeyRound, LogIn, ExternalLink, ShieldCheck, ShieldOff, Loader } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { EditUserForm } from './edit-user-form';
import { useUser } from '@/contexts/user-context';
import { deleteUser, updateUser } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { sendCredentialsEmailAction, createClientAutologinUrl } from '@/app/actions';
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
import { Input } from '../ui/input';
import { createWhatsAppLink } from '@/lib/utils';
import { WhatsAppIcon } from '../icons/whatsapp-icon';

interface ClientsTableProps {
  clients: User[];
  onDataChange: () => void;
}

export function ClientsTable({ clients, onDataChange }: ClientsTableProps) {
    const { user: currentUser } = useUser();
    const { toast } = useToast();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<User | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<User | null>(null);
    const [isSendingCredentials, setIsSendingCredentials] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
    const [isLoggingInAs, setIsLoggingInAs] = useState<string | null>(null);
    const [togglingClientId, setTogglingClientId] = useState<string | null>(null);

    const subscriptionCounts = useMemo(() => {
        const subscribed = clients.filter(c => Boolean(c.isSubscribed)).length;
        return {
            subscribed,
            unsubscribed: clients.length - subscribed,
        };
    }, [clients]);
    
    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            if (subscriptionFilter === 'subscribed' && !client.isSubscribed) return false;
            if (subscriptionFilter === 'unsubscribed' && client.isSubscribed) return false;
            if (!searchTerm) return true;
            return JSON.stringify(client).toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [clients, searchTerm, subscriptionFilter]);

    const handleToggleSubscription = async (client: User, e?: React.MouseEvent | Event) => {
        if (e) e.stopPropagation();
        if (currentUser?.role !== 'Admin' && currentUser?.role !== 'Creator') return;
        setTogglingClientId(client.id);
        try {
            const nextStatus = !Boolean(client.isSubscribed);
            const updated = await updateUser(client.id, { isSubscribed: nextStatus });
            if (updated) {
                onDataChange();
                toast({
                    title: nextStatus ? 'Cliente Abbonato' : 'Abbonamento Rimosso',
                    description: `${client.name} è ora impostato come "${nextStatus ? 'Abbonato' : 'Non Abbonato'}" al servizio di assistenza.`,
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Errore',
                    description: 'Impossibile aggiornare lo stato di abbonamento del cliente.',
                });
            }
        } catch {
            toast({
                variant: 'destructive',
                title: 'Errore',
                description: 'Si è verificato un errore durante l\'aggiornamento dello stato di abbonamento.',
            });
        } finally {
            setTogglingClientId(null);
        }
    };

    const renderSubscriptionBadge = (client: User) => {
        const isSub = Boolean(client.isSubscribed);
        const isLoading = togglingClientId === client.id;
        return (
            <Badge
                variant={isSub ? 'default' : 'secondary'}
                onClick={(e) => handleToggleSubscription(client, e)}
                title={currentUser?.role === 'Admin' || currentUser?.role === 'Creator' ? 'Clicca per cambiare stato abbonamento' : undefined}
                className={
                    isSub
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer inline-flex items-center gap-1 font-semibold'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer inline-flex items-center gap-1 font-medium'
                }
            >
                {isLoading ? (
                    <Loader className="h-3 w-3 animate-spin" />
                ) : isSub ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                    <ShieldOff className="h-3.5 w-3.5" />
                )}
                {isSub ? 'Abbonato' : 'Non Abbonato'}
            </Badge>
        );
    };


    const handleEditClick = (client: User) => {
        setSelectedClient(client);
        setIsEditModalOpen(true);
    };
    
    const handleDeleteClick = (client: User) => {
        setClientToDelete(client);
        setIsDeleteDialogOpen(true);
    }
    
    const handleSendCredentials = async (user: User) => {
        setIsSendingCredentials(user.id);
        const result = await sendCredentialsEmailAction(user.id);
        if (result.success) {
            toast({
                title: 'Email inviata',
                description: `Le credenziali sono state inviate a ${user.email}.`,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Errore',
                description: result.error || 'Impossibile inviare l\'email.',
            });
        }
        setIsSendingCredentials(null);
    }
    
    const handleLoginAsClient = async (client: User) => {
        setIsLoggingInAs(client.id);
        const newWindow = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
        try {
            const result = await createClientAutologinUrl(client.id);
            if (result.success && result.url) {
                if (newWindow) {
                    newWindow.location.href = result.url;
                } else {
                    window.location.href = result.url;
                }
            } else {
                if (newWindow) newWindow.close();
                toast({
                    variant: 'destructive',
                    title: 'Accesso Fallito',
                    description: result.error || 'Impossibile generare il link di accesso per il cliente.',
                });
            }
        } catch (error) {
            if (newWindow) newWindow.close();
            toast({
                variant: 'destructive',
                title: 'Accesso Fallito',
                description: 'Si è verificato un errore durante la generazione del link di accesso.',
            });
        } finally {
            setIsLoggingInAs(null);
        }
    };


    const confirmDelete = async () => {
        if (!clientToDelete) return;
        try {
            await deleteUser(clientToDelete.id);
            onDataChange();
            toast({
                title: 'Cliente eliminato',
                description: `Il cliente ${clientToDelete.name} è stato eliminato con successo.`,
            });
        } catch {
             toast({
                variant: 'destructive',
                title: 'Errore',
                description: "Impossibile eliminare il cliente.",
            });
        }
        setIsDeleteDialogOpen(false);
        setClientToDelete(null);
    }

  return (
    <>
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <Input
                placeholder="Cerca in tutti i campi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
            <Select value={subscriptionFilter} onValueChange={(v) => setSubscriptionFilter(v as 'all' | 'subscribed' | 'unsubscribed')}>
                <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Filtra per assistenza" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tutti i clienti ({clients.length})</SelectItem>
                    <SelectItem value="subscribed">Abbonati ({subscriptionCounts.subscribed})</SelectItem>
                    <SelectItem value="unsubscribed">Non Abbonati ({subscriptionCounts.unsubscribed})</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="flex items-center gap-2 text-xs">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Abbonati: {subscriptionCounts.subscribed}
            </Badge>
            <Badge variant="secondary" className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <ShieldOff className="h-3.5 w-3.5 mr-1" /> Non Abbonati: {subscriptionCounts.unsubscribed}
            </Badge>
        </div>
    </div>
    <Card className="lg:hidden">
        <CardContent className="p-2 space-y-2">
          {filteredClients.map((client) => (
            <div key={client.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex justify-between items-start">
                <div className="flex items-start min-w-0" onClick={() => handleEditClick(client)}>
                    <Avatar className="h-10 w-10 border shrink-0 mr-4">
                        <AvatarImage src={client.avatarUrl} alt={client.name} />
                        <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium break-words uppercase">{client.name}</p>
                            {renderSubscriptionBadge(client)}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground break-all">
                             {client.email && (
                                <a href={`mailto:${client.email}`} onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                    <Mail className="h-4 w-4 shrink-0" /> <span>{client.email}</span>
                                </a>
                            )}
                            {client.phone && (
                                <div className="flex items-center gap-2">
                                    <a href={`tel:${client.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                        <Phone className="h-4 w-4 shrink-0" /> <span>{client.phone}</span>
                                    </a>
                                    <a href={createWhatsAppLink(client.phone)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-green-500">
                                        <WhatsAppIcon className="h-4 w-4" />
                                    </a>
                                </div>
                            )}
                             {client.website && (
                                <a href={client.website} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                    <ExternalLink className="h-4 w-4 shrink-0" /> <span>{client.website}</span>
                                </a>
                            )}
                            {client.address && (
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex items-start gap-2 hover:underline">
                                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" /> <span className="break-words">{client.address}</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => handleLoginAsClient(client)} disabled={isLoggingInAs === client.id}>
                           <LogIn className="mr-2" /> {isLoggingInAs === client.id ? 'Accesso...' : 'Entra come Cliente'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleEditClick(client)}>
                            <Pencil className="mr-2" /> Modifica
                        </DropdownMenuItem>
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Creator') && (
                            <DropdownMenuItem onSelect={(e) => handleToggleSubscription(client, e)} disabled={togglingClientId === client.id}>
                                {client.isSubscribed ? <ShieldOff className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4 text-emerald-600" />}
                                {client.isSubscribed ? 'Segna come Non Abbonato' : 'Segna come Abbonato'}
                            </DropdownMenuItem>
                        )}
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Creator') && (
                           <DropdownMenuItem onSelect={() => handleSendCredentials(client)} disabled={isSendingCredentials === client.id}>
                                <KeyRound className="mr-2" />
                                {isSendingCredentials === client.id ? 'Invio...' : 'Invia Credenziali'}
                           </DropdownMenuItem>
                        )}
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Creator') && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onSelect={() => handleDeleteClick(client)}>
                                    <Trash2 className="mr-2" /> Elimina
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          ))}
        </CardContent>
      </Card>
    <Card className="hidden lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Servizio Assistenza</TableHead>
            <TableHead className="hidden sm:table-cell">Contatti</TableHead>
            <TableHead className="hidden md:table-cell">Indirizzo</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell onClick={() => handleEditClick(client)} className="cursor-pointer">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={client.avatarUrl} alt={client.name} />
                    <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium uppercase">{client.name}</span>
                </div>
              </TableCell>
              <TableCell>
                {renderSubscriptionBadge(client)}
              </TableCell>
              <TableCell onClick={() => handleEditClick(client)} className="hidden sm:table-cell cursor-pointer">
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
                            <a href={createWhatsAppLink(client.phone)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-green-500">
                                <WhatsAppIcon className="h-4 w-4" />
                            </a>
                        </div>
                    )}
                     {client.website && (
                        <a href={client.website} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <span>{client.website}</span>
                        </a>
                     )}
                </div>
              </TableCell>
              <TableCell onClick={() => handleEditClick(client)} className="hidden md:table-cell text-xs cursor-pointer">
                 {client.address && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{client.address}</span>
                    </a>
                 )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => handleLoginAsClient(client)} disabled={isLoggingInAs === client.id}>
                           <LogIn className="mr-2" /> {isLoggingInAs === client.id ? 'Accesso...' : 'Entra come Cliente'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleEditClick(client)}>
                            <Pencil className="mr-2" /> Modifica
                        </DropdownMenuItem>
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Creator') && (
                            <DropdownMenuItem onSelect={(e) => handleToggleSubscription(client, e)} disabled={togglingClientId === client.id}>
                                {client.isSubscribed ? <ShieldOff className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4 text-emerald-600" />}
                                {client.isSubscribed ? 'Segna come Non Abbonato' : 'Segna come Abbonato'}
                            </DropdownMenuItem>
                        )}
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Creator') && (
                           <DropdownMenuItem onSelect={() => handleSendCredentials(client)} disabled={isSendingCredentials === client.id}>
                                <KeyRound className="mr-2" />
                                {isSendingCredentials === client.id ? 'Invio...' : 'Invia Credenziali'}
                           </DropdownMenuItem>
                        )}
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Creator') && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onSelect={() => handleDeleteClick(client)}>
                                    <Trash2 className="mr-2" /> Elimina
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
     <EditUserForm
        user={selectedClient}
        onUserUpdated={onDataChange}
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
                Questa azione non può essere annullata. Il cliente <b>{clientToDelete?.name}</b> verrà eliminato definitivamente.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Elimina</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
