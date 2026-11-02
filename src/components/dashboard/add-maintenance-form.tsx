

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
  DialogTrigger,
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
import { CalendarIcon, Check, ChevronsUpDown, Loader } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScheduledMaintenance, User, InterventionPriority } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addScheduledMaintenance, addUser } from '@/lib/data';
import { ScrollArea } from '../ui/scroll-area';
import { useUser } from '@/contexts/user-context';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';

const formSchema = z.object({
  title: z.string().min(5, { message: 'Il titolo deve contenere almeno 5 caratteri.' }),
  clientId: z.string({ required_error: 'Il cliente è obbligatorio.' }),
  description: z.string().optional(),
  priority: z.enum(['Bassa', 'Media', 'Alta', 'Critica'], { required_error: 'La priorità è obbligatoria.' }),
  dueDate: z.date({ required_error: 'La data di prima esecuzione è obbligatoria.' }),
  assignedOperatorId: z.string().nullable().optional(),
  recurrenceMonths: z.coerce.number().min(1, 'La ricorrenza deve essere di almeno 1 mese.'),
});

interface AddMaintenanceFormProps {
  children: React.ReactNode;
  onMaintenanceAdded: (maintenance: ScheduledMaintenance) => void;
  clients: User[];
  operators: User[];
}

export function AddMaintenanceForm({ children, onMaintenanceAdded, clients, operators }: AddMaintenanceFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useUser();
  const [clientList, setClientList] = useState(clients);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      assignedOperatorId: null,
      recurrenceMonths: 1,
      priority: 'Media'
    },
  });
  
  useEffect(() => {
    setClientList(clients);
  }, [clients]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentCompany) return;
    
    setIsSubmitting(true);
    try {
      let clientIdentifier = values.clientId;
      const existingClient = clientList.find(
        c => c.id === values.clientId || c.name.trim().toLowerCase() === values.clientId.trim().toLowerCase()
      );

      if (!existingClient && values.clientId && values.clientId.trim() !== '') {
        const clientName = values.clientId.trim();
        const cleanSlug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'cliente';
        const placeholderEmail = `cliente_${cleanSlug}_${Date.now()}@placeholder.local`;

        try {
          const newClientUser = await addUser({
            name: clientName,
            email: placeholderEmail,
            role: 'Client',
            companyId: currentCompany.id,
          });

          if (newClientUser && newClientUser.id) {
            clientIdentifier = newClientUser.id;
            setClientList(prev => {
              if (prev.some(c => c.id === newClientUser.id)) return prev;
              return [...prev, newClientUser];
            });
          }
        } catch (clientErr: any) {
          console.error("Error creating inline client user for maintenance:", clientErr);
          throw new Error(clientErr?.message || "Impossibile creare il nuovo cliente.");
        }
      } else if (existingClient) {
        clientIdentifier = existingClient.id;
      }

      const normalizedDate = setHours(setMinutes(values.dueDate, 0), 12).toISOString();
      const newMaintenance = await addScheduledMaintenance({
          ...values,
          clientId: clientIdentifier,
          priority: values.priority as InterventionPriority,
          dueDate: normalizedDate,
          description: values.description || '',
          checklist: [],
          recurrenceMonths: Number(values.recurrenceMonths) || 1,
          nextDueDate: normalizedDate,
          type: 'standard',
          status: 'Pianificato',
          sla: '24h',
          assignedOperatorIds: values.assignedOperatorId ? [values.assignedOperatorId] : [],
          companyId: currentCompany.id,
      });
      
      onMaintenanceAdded(newMaintenance);

      toast({
        title: 'Manutenzione creata',
        description: `La manutenzione "${values.title}" è stata creata con successo.`,
      });
      setIsOpen(false);
      form.reset();
      setClientSearchValue('');
    } catch (err: any) {
      console.error("Error in create maintenance onSubmit:", err);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: err?.message || 'Impossibile creare la manutenzione programmata.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
            form.reset();
            setClientSearchValue('');
        }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl flex flex-col p-0 max-h-[calc(100dvh-1.5rem)] md:max-h-[90vh] h-[calc(100dvh-1.5rem)] md:h-auto w-[calc(100%-1rem)] sm:w-full rounded-2xl md:rounded-lg overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-0 shrink-0 pr-12">
          <DialogTitle>Crea nuova manutenzione programmata</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 h-auto overflow-y-auto">
            <div className="p-4 sm:p-6">
                <Form {...form}>
                <form id="add-maintenance-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        render={({ field }) => {
                            const trimmedSearch = clientSearchValue.trim();
                            const exactClientMatch = trimmedSearch
                                ? clientList.some(c => c.name.trim().toLowerCase() === trimmedSearch.toLowerCase())
                                : false;

                            return (
                            <FormItem className="flex flex-col">
                                <FormLabel>Cliente</FormLabel>
                                <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "justify-between font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? clientList.find(
                                                        (client) => client.id === field.value
                                                    )?.name ?? field.value
                                                    : "Seleziona o crea un cliente"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] max-h-[300px]">
                                        <Command>
                                            <CommandInput
                                                placeholder="Cerca o crea cliente..."
                                                value={clientSearchValue}
                                                onValueChange={setClientSearchValue}
                                            />
                                            <CommandList>
                                                <CommandEmpty>
                                                    {trimmedSearch ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            className="w-full justify-start text-primary font-medium"
                                                            onClick={() => {
                                                                form.setValue("clientId", trimmedSearch, { shouldValidate: true });
                                                                setClientPopoverOpen(false);
                                                            }}
                                                        >
                                                            + Crea &quot;{trimmedSearch}&quot;
                                                        </Button>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">Nessun cliente trovato.</span>
                                                    )}
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {clientList.map((client) => (
                                                        <CommandItem
                                                            value={client.name}
                                                            key={client.id}
                                                            onSelect={() => {
                                                                form.setValue("clientId", client.id, { shouldValidate: true });
                                                                setClientSearchValue('');
                                                                setClientPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    client.id === field.value ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {client.name}
                                                        </CommandItem>
                                                    ))}
                                                    {trimmedSearch && !exactClientMatch && (
                                                        <CommandItem
                                                            value={`__create__${trimmedSearch}`}
                                                            onSelect={() => {
                                                                form.setValue("clientId", trimmedSearch, { shouldValidate: true });
                                                                setClientPopoverOpen(false);
                                                            }}
                                                            className="text-primary font-medium"
                                                        >
                                                            + Crea &quot;{trimmedSearch}&quot;
                                                        </CommandItem>
                                                    )}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            );
                        }}
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
                                <FormLabel>Data prima esecuzione</FormLabel>
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

                </form>
                </Form>
            </div>
        </ScrollArea>
        <DialogFooter className="flex-col-reverse sm:flex-row p-4 sm:p-6 gap-2 border-t shrink-0 bg-background">
            <DialogClose asChild>
                <Button variant="outline" disabled={isSubmitting}>Annulla</Button>
            </DialogClose>
            <Button type="submit" form="add-maintenance-form" disabled={isSubmitting}>
                {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Crea manutenzione
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
