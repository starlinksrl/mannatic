
'use client';

import { useState } from 'react';
import { SupportTicket, User } from '@/lib/types';
import { Header } from './header';
import { Button } from '../ui/button';
import { ArrowLeft, Loader, Send, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { useUser } from '@/contexts/user-context';
import { addSupportMessage, updateSupportTicketStatus, deleteSupportTicket } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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

interface SupportTicketConversationProps {
  ticket: SupportTicket;
  onBack: () => void;
  onTicketUpdated: () => void;
}

export function SupportTicketConversation({ ticket, onBack, onTicketUpdated }: SupportTicketConversationProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


  if (!user) return null;

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;

    setIsSubmitting(true);
    try {
      await addSupportMessage(ticket.id, {
        senderId: user.id,
        senderName: user.name,
        text: newMessage,
      });
      setNewMessage('');
      onTicketUpdated();
      toast({ title: 'Messaggio inviato con successo.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile inviare il messaggio.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: 'Aperto' | 'Chiuso') => {
    setIsSubmitting(true);
     try {
      await updateSupportTicketStatus(ticket.id, newStatus);
      onTicketUpdated();
      toast({ title: 'Stato del ticket aggiornato.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile aggiornare lo stato.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const confirmDelete = async () => {
    setIsSubmitting(true);
    const success = await deleteSupportTicket(ticket.id);
    if (success) {
        onTicketUpdated();
        onBack();
        toast({ title: "Ticket eliminato", description: `Il ticket di supporto è stato eliminato.` });
    } else {
        toast({ variant: 'destructive', title: "Errore", description: "Impossibile eliminare il ticket." });
    }
    setIsSubmitting(false);
    setIsDeleteDialogOpen(false);
  }

  return (
    <>
      <Header title="Conversazione Supporto" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex justify-between items-center">
            <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2" />
            Torna ai ticket
            </Button>
             {user.role === 'Admin' && (
                <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2" />
                    Elimina Conversazione
                </Button>
            )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                    <CardTitle>{ticket.subject}</CardTitle>
                    <CardDescription>
                        Aperto da {ticket.clientName} il {format(new Date(ticket.createdAt), 'dd MMM yyyy, HH:mm', { locale: it })}
                    </CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Stato:</span>
                    <Select onValueChange={handleStatusChange} defaultValue={ticket.status} disabled={isSubmitting || user.role === 'Client'}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Cambia stato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Aperto">Aperto</SelectItem>
                            <SelectItem value="Chiuso">Chiuso</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[40vh] pr-4">
              <div className="space-y-6">
                {ticket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3 text-sm',
                      message.senderId === user.id ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'p-3 rounded-lg max-w-md',
                        message.senderId === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="font-semibold">{message.senderName}</p>
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      <p className="text-xs opacity-70 mt-2 text-right">
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: it })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-6 space-y-4">
              <Textarea
                placeholder={ticket.status === 'Chiuso' ? "Questo ticket è chiuso. Riaprilo per inviare un messaggio." : "Scrivi la tua risposta..."}
                rows={4}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isSubmitting || ticket.status === 'Chiuso'}
              />
              <div className="flex justify-end">
                <Button onClick={handleSendMessage} disabled={isSubmitting || newMessage.trim() === '' || ticket.status === 'Chiuso'}>
                  {isSubmitting && !isDeleteDialogOpen ? <Loader className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                  Invia
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
                Questa azione non può essere annullata. Verrà eliminato permanentemente il ticket e tutta la sua cronologia.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>
                 {isSubmitting && <Loader className="mr-2 animate-spin" />}
                Elimina
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
