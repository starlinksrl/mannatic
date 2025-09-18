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
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Intervention, Client, User, InterventionPriority } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addIntervention } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  title: z.string().min(5, { message: 'Il titolo deve contenere almeno 5 caratteri.' }),
  clientId: z.string({ required_error: 'Il cliente è obbligatorio.' }),
  description: z.string().min(10, { message: 'La descrizione deve contenere almeno 10 caratteri.' }),
  priority: z.enum(['Bassa', 'Media', 'Alta', 'Critica'], { required_error: 'La priorità è obbligatoria.' }),
  dueDate: z.date({ required_error: 'La data di scadenza è obbligatoria.' }),
  assignedOperatorId: z.string().nullable(),
});

interface AddInterventionFormProps {
  children: React.ReactNode;
  onInterventionAdded: (intervention: Intervention) => void;
  clients: Client[];
  operators: User[];
  currentUser: User;
}

export function AddInterventionForm({ children, onInterventionAdded, clients, operators, currentUser }: AddInterventionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useUser();
  const [clientList, setClientList] = useState(clients);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      assignedOperatorId: null,
      clientId: currentUser.role === 'Client' ? currentUser.id : undefined,
    },
  });
  
  useEffect(() => {
    if (currentUser.role === 'Client') {
        form.setValue('clientId', currentUser.id);
    }
  }, [currentUser, clients, form])
  
  useEffect(() => {
    setClientList(clients);
  }, [clients])


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentCompany || !currentUser) return;

    const newIntervention = await addIntervention({
        ...values,
        priority: values.priority as InterventionPriority,
        dueDate: values.dueDate.toISOString(),
        companyId: currentCompany.id,
        creatorName: currentUser.name
    });
    
    onInterventionAdded(newIntervention);
    
    // Check if a new client was created and update the local list
    const isNewClient = !clients.some(c => c.id === newIntervention.clientId);
    if (isNewClient) {
        setClientList(prev => [...prev, {id: newIntervention.clientId, name: values.clientId, companyId: currentCompany.id}]);
    }
    
    toast({
      title: 'Intervento creato',
      description: `L'intervento "${values.title}" è stato creato con successo.`,
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
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Crea nuovo intervento</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="p-6">
                <Form {...form}>
                <form id="add-intervention-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            <FormItem className="flex flex-col">
                                <FormLabel>Cliente</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "justify-between",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                disabled={currentUser.role === 'Client'}
                                            >
                                                {field.value
                                                    ? clientList.find(
                                                        (client) => client.name === field.value
                                                    )?.name ?? field.value
                                                    : "Seleziona o crea un cliente"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0">
                                        <Command>
                                            <CommandInput placeholder="Cerca o crea cliente..." />
                                            <CommandEmpty>
                                                 <Button variant="ghost" className="w-full justify-start"
                                                    onClick={() => {
                                                        const inputValue = (document.querySelector('[cmdk-input]') as HTMLInputElement)?.value;
                                                        form.setValue("clientId", inputValue)
                                                        const popoverTrigger = (document.querySelector('[role=combobox]') as HTMLElement);
                                                        popoverTrigger?.click();
                                                    }}
                                                  >
                                                    Crea "{ (document.querySelector('[cmdk-input]') as HTMLInputElement)?.value }"
                                                  </Button>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {clientList.map((client) => (
                                                    <CommandItem
                                                        value={client.name}
                                                        key={client.id}
                                                        onSelect={() => {
                                                            form.setValue("clientId", client.name)
                                                            const popoverTrigger = (document.querySelector('[role=combobox]') as HTMLElement);
                                                            popoverTrigger?.click();
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                client.name === field.value ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {client.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
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
                                        disabled={(date) => date < new Date()}
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
                </form>
                </Form>
            </div>
        </ScrollArea>
        <DialogFooter className="flex-col-reverse sm:flex-row p-6 pt-0 border-t">
            <DialogClose asChild>
                <Button variant="outline">Annulla</Button>
            </DialogClose>
            <Button type="submit" form="add-intervention-form">Crea intervento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
