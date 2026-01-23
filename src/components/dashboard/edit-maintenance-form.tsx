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
import { ScheduledMaintenance, User, InterventionPriority, ScheduledMaintenanceStatus, InterventionUpdate } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateScheduledMaintenance } from '@/lib/data';
import { ScrollArea } from '../ui/scroll-area';
import { useUser } from '@/contexts/user-context';
import { Separator } from '../ui/separator';

const formSchema = z.object({
  title: z.string().min(5, { message: 'Il titolo deve contenere almeno 5 caratteri.' }),
  clientId: z.string({ required_error: 'Il cliente è obbligatorio.' }),
  description: z.string().optional(),
  priority: z.enum(['Bassa', 'Media', 'Alta', 'Critica'], { required_error: 'La priorità è obbligatoria.' }),
  status: z.enum(['Pianificato', 'In corso', 'Completato', 'Annullato'], { required_error: 'Lo stato è obbligatorio.' }),
  dueDate: z.date({ required_error: 'La data di esecuzione è obbligatoria.' }),
  assignedOperatorId: z.string().nullable(),
  recurrenceMonths: z.coerce.number().min(1, 'La ricorrenza deve essere di almeno 1 mese.'),
  newUpdate: z.string().optional(),
});

interface EditMaintenanceFormProps {
  maintenance: ScheduledMaintenance | null;
  onMaintenanceUpdated: (maintenance: ScheduledMaintenance) => void;
  clients: User[];
  operators: User[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function EditMaintenanceForm({ maintenance, onMaintenanceUpdated, clients, operators, isOpen, setIsOpen }: EditMaintenanceFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (maintenance) {
      form.reset({
        ...maintenance,
        description: maintenance.description || '',
        dueDate: new Date(maintenance.dueDate),
        priority: maintenance.priority,
        status: maintenance.status,
        assignedOperatorId: maintenance.assignedOperatorId || null,
        newUpdate: '',
      });
    }
  }, [maintenance, form]);

  if (!maintenance || !currentUser) return null;


  async function onSubmit(values: z.infer<typeof formSchema>) {
    const isBeingCompleted = values.status === 'Completato' && maintenance?.status !== 'Completato';
    
    let newUpdates: InterventionUpdate[] = maintenance?.updates || [];
    if(values.newUpdate && values.newUpdate.trim() !== '') {
        newUpdates = [{ 
            date: new Date().toISOString(), 
            description: values.newUpdate.trim(),
            userName: currentUser!.name,
        }, ...newUpdates];
    }
    
    const updatedMaintenanceData = {
        ...maintenance,
        ...values,
        description: values.description || '',
        priority: values.priority as InterventionPriority,
        status: values.status as ScheduledMaintenanceStatus,
        dueDate: isBeingCompleted ? new Date().toISOString() : values.dueDate.toISOString(),
        updates: newUpdates
    };
    
    const updated = await updateScheduledMaintenance(maintenance!.id, updatedMaintenanceData);
    
    if (updated) {
        onMaintenanceUpdated(updated);
        toast({
          title: 'Manutenzione aggiornata',
          description: `La manutenzione "${values.title}" è stata aggiornata con successo.`,
        });
        setIsOpen(false);
    } else {
        toast({
            variant: 'destructive',
            title: 'Errore',
            description: "Impossibile aggiornare la manutenzione.",
        });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Modifica Manutenzione #{maintenance.id}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="p-6">
                <Form {...form}>
                <form id="edit-maintenance-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Titolo</FormLabel>
                        <FormControl>
                            <Input placeholder="Es. Controllo trimestrale..." {...field} />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <Textarea placeholder="Descrivi l'attività di manutenzione..." {...field} />
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
                                    <SelectItem value="Pianificato">Pianificato</SelectItem>
                                    <SelectItem value="In corso">In corso</SelectItem>
                                    <SelectItem value="Completato">Completato</SelectItem>
                                    <SelectItem value="Annullato">Annullato</SelectItem>
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
                                <FormLabel>Data Esecuzione</FormLabel>
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
                                            format(field.value, "dd/MM/yy", { locale: it })
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
                        <FormField
                            control={form.control}
                            name="recurrenceMonths"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Ricorrenza (mesi)</FormLabel>
                                <FormControl>
                                    <Input type="number" min="1" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                     <Separator />

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Storico Manutenzione</h4>
                         <FormField
                            control={form.control}
                            name="newUpdate"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Aggiungi aggiornamento</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Scrivi un aggiornamento sull'attività svolta..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                            {maintenance.updates && maintenance.updates.length > 0 ? (
                                maintenance.updates.map((update, index) => (
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
            <Button type="submit" form="edit-maintenance-form">Salva modifiche</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
