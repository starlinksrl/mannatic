
'use client';

import { SupportTicket, User } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '../ui/button';
import { deleteSupportTicket } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';


interface SupportTicketsTableProps {
  tickets: SupportTicket[];
  onTicketSelect: (ticket: SupportTicket) => void;
  currentUser: User;
  onTicketDeleted: () => void;
}

export function SupportTicketsTable({ tickets, onTicketSelect, currentUser, onTicketDeleted }: SupportTicketsTableProps) {
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<SupportTicket | null>(null);


  const getStatusBadge = (status: 'Aperto' | 'Chiuso') => {
    switch (status) {
      case 'Aperto':
        return <Badge className="bg-green-100 text-green-800">Aperto</Badge>;
      case 'Chiuso':
        return <Badge variant="secondary">Chiuso</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleDeleteClick = (e: React.MouseEvent | Event, ticket: SupportTicket) => {
    e.stopPropagation();
    setTicketToDelete(ticket);
    setIsDeleteDialogOpen(true);
  }

  const confirmDelete = async () => {
    if (!ticketToDelete) return;

    const success = await deleteSupportTicket(ticketToDelete.id);
    if (success) {
        onTicketDeleted();
        toast({ title: "Ticket eliminato", description: `Il ticket di supporto è stato eliminato.` });
    } else {
        toast({ variant: 'destructive', title: "Errore", description: "Impossibile eliminare il ticket." });
    }
    setIsDeleteDialogOpen(false);
    setTicketToDelete(null);
  }

  const sortedTickets = [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <Card className="lg:hidden">
        <CardContent className="p-2 space-y-2">
          {sortedTickets.map((ticket) => (
            <div key={ticket.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex justify-between items-start">
               <div className="flex-1 cursor-pointer" onClick={() => onTicketSelect(ticket)}>
                  <div className="flex justify-between items-start">
                    <p className="font-semibold break-words pr-2">{ticket.subject}</p>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {currentUser.role === 'Admin' && <p>Cliente: {ticket.clientName}</p>}
                    <p>Creato: {format(new Date(ticket.createdAt), 'dd/MM/yy HH:mm', { locale: it })}</p>
                    <p>Ultimo aggiorn.: {format(new Date(ticket.updatedAt), 'dd/MM/yy HH:mm', { locale: it })}</p>
                  </div>
               </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-2 -mt-2">
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => onTicketSelect(ticket)}>
                            <Pencil className="mr-2" /> Vedi / Rispondi
                        </DropdownMenuItem>
                        {currentUser.role === 'Admin' && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onSelect={(e) => handleDeleteClick(e, ticket)}>
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
              <TableHead>Oggetto</TableHead>
              {currentUser.role === 'Admin' && <TableHead>Cliente</TableHead>}
              <TableHead>Stato</TableHead>
              <TableHead>Data Creazione</TableHead>
              <TableHead>Ultimo Aggiornamento</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTickets.map((ticket) => (
              <TableRow key={ticket.id} onClick={() => onTicketSelect(ticket)} className="cursor-pointer">
                <TableCell className="font-medium">{ticket.subject}</TableCell>
                {currentUser.role === 'Admin' && <TableCell>{ticket.clientName}</TableCell>}
                <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                <TableCell>{format(new Date(ticket.createdAt), 'dd/MM/yy HH:mm', { locale: it })}</TableCell>
                <TableCell>{format(new Date(ticket.updatedAt), 'dd/MM/yy HH:mm', { locale: it })}</TableCell>
                 <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => onTicketSelect(ticket)}>
                                <Pencil className="mr-2" /> Vedi / Rispondi
                            </DropdownMenuItem>
                             {currentUser.role === 'Admin' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        className="text-destructive focus:text-destructive"
                                        onSelect={(e) => handleDeleteClick(e, ticket)}>
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
                Questa azione non può essere annullata. Verrà eliminato permanentemente il ticket e tutta la sua cronologia.
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
