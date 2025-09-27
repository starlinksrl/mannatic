
'use client';

import React, { useState } from 'react';
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
import { MoreHorizontal, Pencil, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { EditUserForm } from './edit-user-form';
import { useUser } from '@/contexts/user-context';
import { deleteUser } from '@/lib/data';
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
} from "@/components/ui/alert-dialog"

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

    const handleEditClick = (client: User) => {
        setSelectedClient(client);
        setIsEditModalOpen(true);
    };
    
    const handleDeleteClick = (client: User) => {
        setClientToDelete(client);
        setIsDeleteDialogOpen(true);
    }

    const confirmDelete = async () => {
        if (!clientToDelete) return;
        const success = await deleteUser(clientToDelete.id);
        if (success) {
            onDataChange();
            toast({
                title: 'Cliente eliminato',
                description: `Il cliente ${clientToDelete.name} è stato eliminato con successo.`,
            });
        } else {
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
    <Card className="md:hidden">
        <CardContent className="p-2 space-y-2">
          {clients.map((client) => (
            <div key={client.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex justify-between items-start">
                <div className="flex items-start gap-4 flex-1 cursor-pointer" onClick={() => handleEditClick(client)}>
                    <Avatar className="h-10 w-10 border">
                        <AvatarImage src={client.avatarUrl} alt={client.name} />
                        <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2 pr-4 break-words">
                        <p className="font-medium break-words">{client.name}</p>
                        <div className="space-y-1 text-sm text-muted-foreground">
                            {client.email && (
                                <a href={`mailto:${client.email}`} onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                    <Mail className="h-4 w-4" /> <span>{client.email}</span>
                                </a>
                            )}
                            {client.phone && (
                                <a href={`tel:${client.phone}`} onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                    <Phone className="h-4 w-4" /> <span>{client.phone}</span>
                                </a>
                            )}
                            {client.address && (
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex items-start gap-2 hover:underline">
                                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" /> <span>{client.address}</span>
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
                        <DropdownMenuItem onSelect={() => handleEditClick(client)}>
                            <Pencil className="mr-2" /> Modifica
                        </DropdownMenuItem>
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Creator') && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
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
    <Card className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden sm:table-cell">Contatti</TableHead>
            <TableHead className="hidden md:table-cell">Indirizzo</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell onClick={() => handleEditClick(client)} className="cursor-pointer">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={client.avatarUrl} alt={client.name} />
                    <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{client.name}</span>
                </div>
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
                        <a href={`tel:${client.phone}`} onClick={e=>e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{client.phone}</span>
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
                        <DropdownMenuItem onSelect={() => handleEditClick(client)}>
                            <Pencil className="mr-2" /> Modifica
                        </DropdownMenuItem>
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Creator') && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
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
