
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { addSupportTicket } from '@/lib/data';
import { Loader } from 'lucide-react';
import { SupportTicket } from '@/lib/types';

const formSchema = z.object({
  subject: z.string().min(10, { message: 'L\'oggetto deve contenere almeno 10 caratteri.' }),
  message: z.string().min(20, { message: 'Il messaggio deve contenere almeno 20 caratteri.' }),
});

interface AddSupportTicketFormProps {
  children: React.ReactNode;
  onTicketAdded: (ticket: SupportTicket) => void;
}

export function AddSupportTicketForm({ children, onTicketAdded }: AddSupportTicketFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user, currentCompany } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { subject: '', message: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentCompany || !user || user.role !== 'Client') return;

    setIsSubmitting(true);
    try {
      const newTicket = await addSupportTicket({
        clientId: user.id,
        clientName: user.name,
        companyId: currentCompany.id,
        subject: values.subject,
        initialMessage: values.message,
        sender: user,
      });
      onTicketAdded(newTicket);
      toast({
        title: 'Ticket di supporto creato',
        description: 'La tua richiesta è stata inviata. Un operatore ti risponderà a breve.',
      });
      setIsOpen(false);
      form.reset();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile creare il ticket di supporto.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Apri un nuovo ticket di supporto</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form id="add-ticket-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oggetto</FormLabel>
                  <FormControl>
                    <Input placeholder="Es. Problema con la fatturazione" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrivi la tua richiesta</FormLabel>
                  <FormControl>
                    <Textarea rows={6} placeholder="Descrivi in dettaglio il problema o la domanda..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Annulla
            </Button>
          </DialogClose>
          <Button type="submit" form="add-ticket-form" disabled={isSubmitting}>
            {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Invia Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
