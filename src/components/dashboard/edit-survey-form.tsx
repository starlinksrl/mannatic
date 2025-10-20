

'use client';

import React, { useRef, useEffect, useState } from 'react';
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
import { CalendarIcon, Loader, MapPin } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn, generateGoogleCalendarLink } from '@/lib/utils';
import { Appointment, User, AppointmentStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateAppointment } from '@/lib/data';
import { ScrollArea } from '../ui/scroll-area';
import { Autocomplete } from '@react-google-maps/api';
import { useMaps } from '@/contexts/maps-context';

const formSchema = z.object({
  title: z.string().min(5, { message: 'Il titolo deve contenere almeno 5 caratteri.' }),
  clientId: z.string({ required_error: 'Il cliente è obbligatorio.' }),
  address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  date: z.date().optional().nullable(),
  time: z.string().optional().nullable(),
  assignedOperatorId: z.string().nullable(),
  status: z.enum(['Pianificato', 'Eseguito', 'Annullato', 'Archiviato'], { required_error: 'Lo stato è obbligatorio.' }),
  notes: z.string().optional(),
});

interface EditAppointmentFormProps {
  appointment: Appointment | null;
  onAppointmentUpdated: (appointment: Appointment) => void;
  clients: User[];
  operators: User[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function EditSurveyForm({ appointment: survey, onAppointmentUpdated: onSurveyUpdated, clients, operators, isOpen, setIsOpen }: EditAppointmentFormProps) {
  const { toast } = useToast();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isLoaded } = useMaps();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      time: '',
    },
  });
  
  useEffect(() => {
    if (survey) {
        const surveyDate = survey.date ? new Date(survey.date) : null;
        form.reset({
            ...survey,
            date: surveyDate,
            time: surveyDate ? format(surveyDate, 'HH:mm') : '',
            address: survey.address || '',
            notes: survey.notes || '',
            assignedOperatorId: survey.assignedOperatorId || null,
            latitude: survey.latitude || null,
            longitude: survey.longitude || null,
        })
    }
  }, [survey, form]);

  const watchedValues = form.watch();

  if (!survey) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
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


    const updatedAppointmentData = {
        ...survey,
        ...values,
        date: finalDate,
    };
    
    const updated = await updateAppointment(survey!.id, updatedAppointmentData);
    
    if (updated) {
        onSurveyUpdated(updated);
        toast({
          title: 'Appuntamento aggiornato',
          description: `L'appuntamento "${values.title}" è stato aggiornato.`,
        });
        setIsOpen(false);
    } else {
        toast({
            variant: 'destructive',
            title: 'Errore',
            description: "Impossibile aggiornare l'appuntamento.",
        });
    }
    setIsSubmitting(false);
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

  const calendarLink = generateGoogleCalendarLink({
    ...survey,
    ...watchedValues,
    date: watchedValues.date?.toISOString(),
  } as Appointment);


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Modifica appuntamento #{survey.id}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="p-6">
                <Form {...form}>
                <form id="edit-appointment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Titolo</FormLabel>
                        <FormControl>
                            <Input {...field} />
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
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Stato</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona uno stato" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Pianificato">Pianificato</SelectItem>
                                    <SelectItem value="Eseguito">Eseguito</SelectItem>
                                    <SelectItem value="Annullato">Annullato</SelectItem>
                                    <SelectItem value="Archiviato">Archiviato</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

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
        <DialogFooter className="flex-col-reverse sm:flex-row p-6 pt-0 border-t justify-between">
            <div>
              {calendarLink && (
                  <Button variant="outline" asChild>
                      <a href={calendarLink} target="_blank" rel="noopener noreferrer">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Aggiungi a Google Calendar
                      </a>
                  </Button>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <DialogClose asChild>
                  <Button variant="outline" disabled={isSubmitting}>Annulla</Button>
              </DialogClose>
              <Button type="submit" form="edit-appointment-form" disabled={isSubmitting}>
                  {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Salva Modifiche
              </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
