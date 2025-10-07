
'use client';

import { SupportTicket, User } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '../ui/button';

interface SupportTicketsTableProps {
  tickets: SupportTicket[];
  onTicketSelect: (ticket: SupportTicket) => void;
  currentUser: User;
}

export function SupportTicketsTable({ tickets, onTicketSelect, currentUser }: SupportTicketsTableProps) {

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

  const sortedTickets = [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <Card className="lg:hidden">
        <CardContent className="p-2 space-y-2">
          {sortedTickets.map((ticket) => (
            <div key={ticket.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer" onClick={() => onTicketSelect(ticket)}>
              <div className="flex justify-between items-start">
                <p className="font-semibold break-words">{ticket.subject}</p>
                {getStatusBadge(ticket.status)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {currentUser.role === 'Admin' && <p>Cliente: {ticket.clientName}</p>}
                <p>Creato: {format(new Date(ticket.createdAt), 'dd/MM/yy HH:mm', { locale: it })}</p>
                <p>Ultimo aggiorn.: {format(new Date(ticket.updatedAt), 'dd/MM/yy HH:mm', { locale: it })}</p>
              </div>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
