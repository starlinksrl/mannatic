

'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { CalendarIcon, Check, ChevronsUpDown, Loader, MapPin } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Appointment, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addAppointment } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { ScrollArea } from '../ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { Autocomplete } from '@react-google-maps/api';
import { useMaps } from '@/contexts/maps-context';

const formSchema = z.object({
  title: z.string().min(5, { message: 'Il titolo deve contenere almeno 5 caratteri.' }),
  clientId: z.string({ required_error: 'Il cliente è obbligatorio.' }),
  address: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  date: z.date().optional(),
  time: z.string().optional(),
  assignedOperatorId: z.string().nullable(),
  notes: z.string().optional(),
});

interface AddAppointmentFormProps {
  children: React.ReactNode;
  onAppointmentAdded: (appointment: Appointment) => void;
  clients: User[];
  operators: User[];
}

export function AddSurveyForm({ children, onAppointmentAdded: onSurveyAdded, clients, operators }: AddAppointmentFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useUser();
  const [clientList, setClientList] = useState(clients);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isLoaded } = useMaps();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      address: '',
      notes: '',
      assignedOperatorId: null,
      time: '',
      latitude: null,
      longitude: null,
    },
  });

  useEffect(() => {
    setClientList(clients);
  }, [clients]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentCompany) return;
    
    setIsSubmitting(true);
    let finalDate: string | null = null;
    if (values.date && values.time) {
        const [hours, minutes] = values.time.split(':').map(Number);
        let date = values.date;
        date = setHours(date, hours);
        date = setMinutes(date, minutes);
        finalDate = date.toISOString();
    } else if (values.date) {
        finalDate = values.date.toISOString();
    }

    const newAppointment = await addAppointment({
        ...values,
        notes: values.notes || '',
        address: values.address || null,
        date: finalDate,
        companyId: currentCompany.id,
    });
    
    onSurveyAdded(newAppointment);

    // Check if a new client was created and update the local list
    const isNewClient = !clients.some(c => c.id === newAppointment.clientId);
    if (isNewClient) {
        const client = {
            id: newAppointment.clientId,
            name: values.clientId,
            companyId: currentCompany.id,
            address: values.address
        } as User;
        setClientList(prev => [...prev, client]);
    }
    
    toast({
      title: 'Appuntamento creato',
      description: `L'appuntamento "${values.title}" è stato creato con successo.`,
    });
    setIsSubmitting(false);
    setIsOpen(false);
    form.reset();
  }
  
  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
        const place = autocompleteRef.current.getPlace();
        if (place && place.formatted_address) {
            form.setValue('address', place.formatted_address, { shouldValidate: true, shouldDirty: true });
        }
        if (place?.geometry?.location) {
            form.setValue('latitude', place.geometry.location.lat());
            form.setValue('longitude', place.geometry.location.lng());
        }
    }
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
        toast({
            variant: 'destructive',
            title: 'Geolocalizzazione non supportata',
        });
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (position) => {
            form.setValue('latitude', position.coords.latitude, { shouldDirty: true });
            form.setValue('longitude', position.coords.longitude, { shouldDirty: true });
            toast({
                title: 'Posizione acquisita',
            });
        },
        () => {
            toast({
                variant: 'destructive',
                title: 'Errore di geolocalizzazione',
            });
        }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) form.reset({
          title: '',
          address: '',
          notes: '',
          assignedOperatorId: null,
          time: '',
          latitude: null,
          longitude: null,
        });
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Crea nuovo appuntamento</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="p-6">
                <Form {...form}>
                <form id="add-appointment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Titolo</FormLabel>
                        <FormControl>
                            <Input placeholder="Es. Appuntamento per nuovo impianto..." {...field} />
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
                                                            form.setValue("clientId", client.id)
                                                            const popoverTrigger = (document.querySelector('[role=combobox]') as HTMLElement);
                                                            popoverTrigger?.click();
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
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                           <div className="flex items-center justify-between">
                            <FormLabel>Indirizzo (Opzionale)</FormLabel>
                            <Button type="button" variant="ghost" size="sm" onClick={handleGeolocate}>
                                <MapPin className="mr-2 h-4 w-4" />
                                Localizza
                            </Button>
                          </div>
                           <FormControl>
                                {isLoaded ? (
                                    <Autocomplete
                                        onLoad={(autocomplete) => {
                                            autocompleteRef.current = autocomplete;
                                        }}
                                        onPlaceChanged={handlePlaceChanged}
                                        fields={['formatted_address', 'geometry.location']}
                                    >
                                        <Input
                                            {...field}
                                            ref={inputRef}
                                            placeholder="Via, numero civico, città"
                                            value={field.value || ''}
                                        />
                                    </Autocomplete>
                                ) : (
                                   <Input
                                        {...field}
                                        placeholder="Via, numero civico, città"
                                        disabled
                                        value={field.value || ''}
                                    />
                                )}
                            </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="latitude"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Latitudine</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled value={field.value ?? ''} />
                                </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="longitude"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Longitudine</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled value={field.value ?? ''} />
                                </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-2">
                             <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Data (Opzionale)</FormLabel>
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
                                name="time"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Ora</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} value={field.value || ''} />
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
                                        <SelectValue placeholder="Assegna a un operatore" />
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

                     <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Note</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Note aggiuntive per l'appuntamento..." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </form>
                </Form>
            </div>
        </ScrollArea>
        <DialogFooter className="flex-col-reverse sm:flex-row p-6 pt-0 border-t">
            <DialogClose asChild>
                <Button variant="outline" disabled={isSubmitting}>Annulla</Button>
            </DialogClose>
            <Button type="submit" form="add-appointment-form" disabled={isSubmitting}>
                {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Crea Appuntamento
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
