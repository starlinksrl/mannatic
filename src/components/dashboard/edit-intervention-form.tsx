'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, MessageSquarePlus } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Intervention, Client, User, InterventionPriority, InterventionStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateIntervention } from '@/lib/data';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useUser } from '@/contexts/user-context';

const formSchema = z.object({
  title: z.string().min(5, { message: 'Il titolo deve contenere almeno 5 caratteri.' }),
  clientId: z.string({ required_error: 'Il cliente è obbligatorio.' }),
  description: z.string().min(10, { message: 'La descrizione deve contenere almeno 10 caratteri.' }),
  priority: z.enum(['Bassa', 'Media', 'Alta', 'Critica'], { required_error: 'La priorità è obbligatoria.' }),
  status: z.enum(['Nuovo', 'In corso', 'In attesa', 'Completato', 'Annullato', 'Da Fatturare', 'Fatturato'], { required_error: 'Lo stato è obbligatorio.' }),
  dueDate: z.date({ required_error: 'La data di scadenza è obbligatoria.' }),
  assignedOperatorId: z.string().nullable(),
  newUpdate: z.string().optional(),
  timeSpent: z.coerce.number().positive({ message: 'Le ore impiegate devono essere un numero positivo.' }).optional(),
  materialsUsed: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.status === 'Completato') {
        if (!data.timeSpent) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['timeSpent'],
                message: 'Le ore impiegate sono obbligatorie per completare l\'intervento.',
            });
        }
        if (!data.materialsUsed || data.materialsUsed.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['materialsUsed'],
                message: 'I materiali impiegati sono obbligatori per completare l\'intervento.',
            });
        }
    }
});

interface EditInterventionFormProps {
  intervention: Intervention | null;
  onInterventionUpdated: (intervention: Intervention) => void;
  clients: Client[];
  operators: User[];
  currentUser: User;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function EditInterventionForm({ intervention, onInterventionUpdated, clients, operators, currentUser, isOpen, setIsOpen }: EditInterventionFormProps) {
  const { toast } = useToast();
  const { currentCompany } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (intervention) {
      form.reset({
        ...intervention,
        dueDate: new Date(intervention.dueDate),
        priority: intervention.priority,
        status: intervention.status,
        assignedOperatorId: intervention.assignedOperatorId || null,
        newUpdate: '',
        timeSpent: intervention.timeSpent || undefined,
        materialsUsed: intervention.materialsUsed || '',
      });
    }
  }, [intervention, form]);

  if (!intervention) return null;


  async function onSubmit(values: z.infer<typeof formSchema>) {
    
    let newUpdates = intervention?.updates || [];
    if(values.newUpdate && values.newUpdate.trim() !== '') {
        newUpdates = [{ 
            date: new Date().toISOString(), 
            description: values.newUpdate.trim(),
            userName: currentUser.name
        }, ...newUpdates];
    }

    const updatedInterventionData = {
        ...intervention,
        ...values,
        priority: values.priority as InterventionPriority,
        status: values.status as InterventionStatus,
        dueDate: values.dueDate.toISOString(),
        updates: newUpdates,
        timeSpent: values.timeSpent || null,
        materialsUsed: values.materialsUsed || null,
        completedAt: values.status === 'Completato' && !intervention?.completedAt ? new Date().toISOString() : intervention?.completedAt || null,
    };
    
    const updated = await updateIntervention(intervention!.id, updatedInterventionData);
    
    if (updated) {
        onInterventionUpdated(updated);
        toast({
          title: 'Intervento aggiornato',
          description: `L'intervento "${values.title}" è stato aggiornato con successo.`,
        });
        setIsOpen(false);
    } else {
        toast({
            variant: 'destructive',
            title: 'Errore',
            description: "Impossibile aggiornare l'intervento.",
        });
    }
  }
  
  const canSetInvoiceStatus = currentUser.role === 'Admin' || currentUser.role === 'Creator';


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Modifica intervento #{intervention.id}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="p-6">
                <Form {...form}>
                <form id="edit-intervention-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Titolo</FormLabel>
                        <FormControl>
                            <Input placeholder="Es. Riparazione perdita..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    
                    <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={currentUser.role === 'Client'}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona un cliente" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                    <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descrizione</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Descrivi il problema in dettaglio..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Stato</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona uno stato" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Nuovo">Nuovo</SelectItem>
                                    <SelectItem value="In corso">In corso</SelectItem>
                                    <SelectItem value="In attesa">In attesa</SelectItem>
                                    <SelectItem value="Completato">Completato</SelectItem>
                                    {canSetInvoiceStatus && (
                                        <>
                                            <SelectItem value="Da Fatturare">Da Fatturare</SelectItem>
                                            <SelectItem value="Fatturato">Fatturato</SelectItem>
                                        </>
                                    )}
                                    <SelectItem value="Annullato">Annullato</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Priorità</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona una priorità" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="Bassa">Bassa</SelectItem>
                                <SelectItem value="Media">Media</SelectItem>
                                <SelectItem value="Alta">Alta</SelectItem>
                                <SelectItem value="Critica">Critica</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Data Scadenza</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, "PPP", { locale: it })
                                        ) : (
                                            <span>Scegli una data</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                        locale={it}
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                        )}
                        />
                    </div>

                    {currentUser.role === 'Admin' && (
                        <FormField
                            control={form.control}
                            name="assignedOperatorId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Assegna a Operatore</FormLabel>
                                <Select 
                                    onValueChange={(value) => field.onChange(value === 'null' ? null : value)} 
                                    value={field.value || 'null'}
                                >
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assegna a un operatore (opzionale)" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="null">Non assegnato</SelectItem>
                                    {operators.map(operator => (
                                        <SelectItem key={operator.id} value={operator.id}>{operator.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <Separator />
                    
                    <h4 className="text-sm font-medium">Dettagli Completamento</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="timeSpent"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ore Totali Impiegate</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Es. 8" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="materialsUsed"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Materiali Impiegati</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Elencare i materiali utilizzati..." {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <Separator />

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Aggiornamenti Intervento</h4>
                         <FormField
                            control={form.control}
                            name="newUpdate"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Aggiungi nuovo aggiornamento</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Scrivi un aggiornamento..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                            {intervention.updates && intervention.updates.length > 0 ? (
                                intervention.updates.map((update, index) => (
                                    <div key={index} className="flex items-start gap-3 text-sm">
                                        <MessageSquarePlus className="w-4 h-4 mt-1 text-muted-foreground" />
                                        <div className="flex-1">
                                            <p className="text-muted-foreground">
                                                <span className="font-semibold">{update.userName}</span>
                                                {' - '}
                                                {formatDistanceToNow(new Date(update.date), { addSuffix: true, locale: it })}
                                            </p>
                                            <p>{update.description}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nessun aggiornamento.</p>
                            )}
                        </div>
                    </div>


                </form>
                </Form>
            </div>
        </ScrollArea>

        <DialogFooter className="flex-col-reverse sm:flex-row p-6 pt-0 border-t">
            <DialogClose asChild>
                <Button variant="outline">Annulla</Button>
            </DialogClose>
            <Button type="submit" form="edit-intervention-form">Salva modifiche</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    