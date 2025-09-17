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
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScheduledMaintenance, Client, User, Equipment, InterventionPriority } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addScheduledMaintenance, getEquipments } from '@/lib/data';
import { ScrollArea } from '../ui/scroll-area';
import { useUser } from '@/contexts/user-context';

const formSchema = z.object({
  title: z.string().min(5, { message: 'Il titolo deve contenere almeno 5 caratteri.' }),
  clientId: z.string({ required_error: 'Il cliente è obbligatorio.' }),
  equipmentId: z.string({ required_error: 'L\'attrezzatura è obbligatoria.' }),
  description: z.string().optional(),
  priority: z.enum(['Bassa', 'Media', 'Alta', 'Critica'], { required_error: 'La priorità è obbligatoria.' }),
  dueDate: z.date({ required_error: 'La data di prima esecuzione è obbligatoria.' }),
  assignedOperatorId: z.string().nullable(),
  recurrenceMonths: z.coerce.number().min(1, 'La ricorrenza deve essere di almeno 1 mese.'),
});

interface AddMaintenanceFormProps {
  children: React.ReactNode;
  onMaintenanceAdded: (maintenance: ScheduledMaintenance) => void;
  clients: Client[];
  operators: User[];
}

export function AddMaintenanceForm({ children, onMaintenanceAdded, clients, operators }: AddMaintenanceFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const { currentCompany } = useUser();

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

  const selectedClientId = form.watch('clientId');

  useEffect(() => {
    if (selectedClientId && currentCompany) {
      const companyEquipments = getEquipments(currentCompany.id);
      setEquipments(companyEquipments.filter(e => e.clientId === selectedClientId));
      form.setValue('equipmentId', '');
    } else {
      setEquipments([]);
    }
  }, [selectedClientId, form, currentCompany]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentCompany) return;
    
    const newMaintenance = await addScheduledMaintenance({
        ...values,
        priority: values.priority as InterventionPriority,
        dueDate: values.dueDate.toISOString(),
        description: values.description || '',
        checklist: [],
        periodicity: 'monthly',
        companyId: currentCompany.id,
    });
    
    onMaintenanceAdded(newMaintenance);
    toast({
      title: 'Manutenzione creata',
      description: `La manutenzione "${values.title}" è stata creata con successo.`,
    });
    setIsOpen(false);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
            form.reset();
        }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Crea nuova manutenzione programmata</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="p-6">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                        name="equipmentId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Attrezzatura</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedClientId}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={selectedClientId ? "Seleziona un'attrezzatura" : "Seleziona prima un cliente"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {equipments.map(equipment => (
                                    <SelectItem key={equipment.id} value={equipment.id}>{equipment.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>

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

                </form>
                </Form>
            </div>
        </ScrollArea>
        <DialogFooter className="flex-col-reverse sm:flex-row p-6 pt-0">
            <DialogClose asChild>
                <Button variant="outline">Annulla</Button>
            </DialogClose>
            <Button type="submit" form="add-maintenance-form">Crea manutenzione</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
