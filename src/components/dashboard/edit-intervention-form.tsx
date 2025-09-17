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
import { Intervention, Client, User, Equipment, InterventionPriority, InterventionStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateIntervention, equipments as allEquipments } from '@/lib/data';

const formSchema = z.object({
  title: z.string().min(5, { message: 'Il titolo deve contenere almeno 5 caratteri.' }),
  clientId: z.string({ required_error: 'Il cliente è obbligatorio.' }),
  equipmentId: z.string({ required_error: 'L\'attrezzatura è obbligatoria.' }),
  description: z.string().min(10, { message: 'La descrizione deve contenere almeno 10 caratteri.' }),
  priority: z.enum(['Bassa', 'Media', 'Alta', 'Critica'], { required_error: 'La priorità è obbligatoria.' }),
  status: z.enum(['Nuovo', 'In corso', 'In attesa', 'Completato', 'Annullato'], { required_error: 'Lo stato è obbligatorio.' }),
  dueDate: z.date({ required_error: 'La data di scadenza è obbligatoria.' }),
  assignedOperatorId: z.string().nullable(),
});

interface EditInterventionFormProps {
  children: React.ReactNode;
  intervention: Intervention;
  onInterventionUpdated: (intervention: Intervention) => void;
  clients: Client[];
  operators: User[];
  currentUser: User;
}

export function EditInterventionForm({ children, intervention, onInterventionUpdated, clients, operators, currentUser }: EditInterventionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...intervention,
      dueDate: new Date(intervention.dueDate),
      priority: intervention.priority,
      status: intervention.status,
      assignedOperatorId: intervention.assignedOperatorId || null,
    },
  });

  const selectedClientId = form.watch('clientId');

  useEffect(() => {
    if (selectedClientId) {
      setEquipments(allEquipments.filter(e => e.clientId === selectedClientId));
    } else {
      setEquipments([]);
    }
  }, [selectedClientId, form]);

  useEffect(() => {
    form.reset({
      ...intervention,
      dueDate: new Date(intervention.dueDate),
      priority: intervention.priority,
      status: intervention.status,
      assignedOperatorId: intervention.assignedOperatorId || null,
    });
  }, [intervention, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const updatedInterventionData = {
        ...intervention,
        ...values,
        priority: values.priority as InterventionPriority,
        status: values.status as InterventionStatus,
        dueDate: values.dueDate.toISOString()
    };
    
    const updated = updateIntervention(intervention.id, updatedInterventionData);
    
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifica intervento #{intervention.id}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="equipmentId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Attrezzatura</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClientId}>
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

            <DialogFooter className="flex-col-reverse sm:flex-row">
                <DialogClose asChild>
                    <Button variant="outline">Annulla</Button>
                </DialogClose>
                <Button type="submit">Salva modifiche</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
