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
import { CalendarIcon, MessageSquarePlus, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow, addMonths, setHours, setMinutes } from 'date-fns';
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
  assignedOperatorId: z.string().nullable().optional(),
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      clientId: '',
      description: '',
      priority: 'Media',
      status: 'Pianificato',
      dueDate: new Date(),
      assignedOperatorId: null,
      recurrenceMonths: 1,
      newUpdate: '',
    },
  });

  useEffect(() => {
    if (maintenance && isOpen) {
      const currentOpId = (maintenance.assignedOperatorIds && maintenance.assignedOperatorIds.length > 0)
        ? maintenance.assignedOperatorIds[0]
        : ((maintenance as any).assignedOperatorId || null);

      const rawDate = maintenance.nextDueDate || maintenance.dueDate;
      let parsedDate = new Date();
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        }
      }

      form.reset({
        title: maintenance.title || '',
        clientId: maintenance.clientId || '',
        description: maintenance.description || '',
        dueDate: parsedDate,
        priority: maintenance.priority || 'Media',
        status: maintenance.status || 'Pianificato',
        assignedOperatorId: currentOpId,
        recurrenceMonths: maintenance.recurrenceMonths || 1,
        newUpdate: '',
      });
    }
  }, [maintenance, isOpen, form]);

  if (!maintenance || !currentUser) return null;


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!maintenance || !currentUser) return;
    setIsSubmitting(true);
    try {
      const isBeingCompleted = values.status === 'Completato' && maintenance?.status !== 'Completato';
      
      let newUpdates: InterventionUpdate[] = maintenance?.updates || [];
      if(values.newUpdate && values.newUpdate.trim() !== '') {
          newUpdates = [{ 
              date: new Date().toISOString(), 
              description: values.newUpdate.trim(),
              userName: currentUser.name,
          }, ...newUpdates];
      }

      const assignedOperatorIds = (values.assignedOperatorId && values.assignedOperatorId !== 'null')
          ? [values.assignedOperatorId]
          : [];

      let dueDateIso: string;
      let nextDueDateIso: string;

      if (isBeingCompleted) {
        dueDateIso = new Date().toISOString();
        const nextDate = addMonths(new Date(), values.recurrenceMonths || 1);
        nextDueDateIso = setHours(setMinutes(nextDate, 0), 12).toISOString();
      } else {
        const normalizedDate = setHours(setMinutes(values.dueDate, 0), 12).toISOString();
        dueDateIso = normalizedDate;
        nextDueDateIso = normalizedDate;
      }
      
      const updatedMaintenanceData: ScheduledMaintenance = {
          ...maintenance,
          title: values.title,
          clientId: values.clientId,
          description: values.description || '',
          priority: values.priority as InterventionPriority,
          status: values.status as ScheduledMaintenanceStatus,
          dueDate: dueDateIso,
          nextDueDate: nextDueDateIso,
          recurrenceMonths: values.recurrenceMonths,
          assignedOperatorIds: assignedOperatorIds,
          updates: newUpdates
      };
      
      const updated = await updateScheduledMaintenance(maintenance.id, updatedMaintenanceData);
      
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
    } catch (error) {
      console.error("Error updating scheduled maintenance:", error);
      toast({
          variant: 'destructive',
          title: 'Errore',
          description: "Si è verificato un errore durante l'aggiornamento.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl flex flex-col p-0 max-h-[calc(100dvh-1.5rem)] md:max-h-[90vh] h-[calc(100dvh-1.5rem)] md:h-auto w-[calc(100%-1rem)] sm:w-full rounded-2xl md:rounded-lg overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-0 shrink-0 pr-12">
          <DialogTitle>Modifica Manutenzione</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 h-auto overflow-y-auto">
            <div className="p-4 sm:p-6">
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
                                <FormLabel>Data Prossima Scadenza</FormLabel>
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
                                            format(field.value, "dd/MM/yyyy", { locale: it })
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
                                <FormLabel>Assegna a Operatore (Opzionale)</FormLabel>
                                <Select 
                                    onValueChange={(value) => field.onChange(value === 'null' ? null : value)} 
                                    value={field.value || 'null'}
                                >
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Non assegnato" />
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

        <DialogFooter className="flex-col-reverse sm:flex-row p-4 sm:p-6 gap-2 border-t shrink-0 bg-background">
            <DialogClose asChild>
                <Button variant="outline" disabled={isSubmitting}>Annulla</Button>
            </DialogClose>
            <Button type="submit" form="edit-maintenance-form" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salva modifiche
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
