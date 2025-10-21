

'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  DialogTrigger,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, UserRole, AllowedSector } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addUser } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { Eye, EyeOff, Loader, MapPin } from 'lucide-react';
import { Autocomplete } from '@react-google-maps/api';
import { Checkbox } from '../ui/checkbox';
import { useMaps } from '@/contexts/maps-context';
import { Textarea } from '../ui/textarea';

const allowedSectors: { id: AllowedSector; label: string }[] = [
    { id: 'interventions', label: 'Interventi' },
    { id: 'new_installations', label: 'Nuovi Impianti' },
    { id: 'surveys', label: 'Appuntamenti' },
    { id: 'maintenance', label: 'Manutenzioni' },
];

const formSchema = z.object({
  name: z.string().min(2, { message: 'Il nome deve contenere almeno 2 caratteri.' }),
  email: z.string().email({ message: 'Inserisci un indirizzo email valido.' }),
  role: z.enum(['Admin', 'Operator', 'Client', 'Creator'], { required_error: 'Il ruolo è obbligatorio.' }),
  password: z.string().min(8, { message: 'La password deve contenere almeno 8 caratteri.'}).optional().or(z.literal('')),
  address: z.string().optional(),
  phone: z.string().optional(),
  allowedSectors: z.array(z.string()).optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  clientNotes: z.string().optional(),
  vatNumber: z.string().optional(),
  taxCode: z.string().optional(),
  uniqueCode: z.string().optional(),
  logoUrl: z.string().optional(),
});

interface AddUserFormProps {
  children: React.ReactNode;
  onUserAdded: (user?: User) => void;
  defaultRole?: UserRole;
  isClientForm?: boolean;
}

const isMainCreator = (user: User | null) => user?.email === 'creator@mannatic.com';

export function AddUserForm({ children, onUserAdded, defaultRole, isClientForm = false }: AddUserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user: currentUser, currentCompany } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { isLoaded } = useMaps();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      address: '',
      phone: '',
      role: defaultRole,
      allowedSectors: ['interventions', 'new_installations', 'surveys', 'maintenance'], // Default to all for new operators
      clientNotes: '',
    },
  });
  
  useEffect(() => {
    if (isOpen) {
        form.reset({
          name: '',
          email: '',
          password: '',
          address: '',
          phone: '',
          role: defaultRole,
          allowedSectors: ['interventions', 'new_installations', 'surveys', 'maintenance'],
          clientNotes: '',
        });
        setShowPassword(false);
    }
  }, [isOpen, defaultRole, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isMainCreator(currentUser) && values.role !== 'Creator') {
        toast({ variant: 'destructive', title: 'Azione non permessa', description: 'Il Main Creator può creare solo altri utenti Creator.' });
        return;
    }

    if (!isMainCreator(currentUser) && values.role === 'Creator') {
        toast({ variant: 'destructive', title: 'Azione non permessa', description: 'Non hai i permessi per creare un utente Creator.' });
        return;
    }
    
    if (!currentCompany && values.role !== 'Creator') {
        toast({ variant: 'destructive', title: 'Errore', description: 'Nessuna azienda selezionata per creare questo utente.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
        const newUser = await addUser({
            name: values.name,
            email: values.email,
            role: values.role as UserRole,
            companyId: values.role === 'Creator' ? 'none' : currentCompany!.id,
            address: values.address,
            phone: values.phone,
            password: values.password || 'starlink74',
            allowedSectors: values.role === 'Operator' ? (values.allowedSectors as AllowedSector[]) : undefined,
            latitude: values.latitude,
            longitude: values.longitude,
            clientNotes: values.role === 'Client' ? values.clientNotes : undefined,
            logoUrl: values.logoUrl,
            vatNumber: values.vatNumber,
            taxCode: values.taxCode,
            uniqueCode: values.uniqueCode,
        });
        
        onUserAdded();
        toast({
        title: `${isClientForm ? 'Cliente' : 'Utente'} creato`,
        description: `${isClientForm ? 'Il cliente' : 'L\'utente'} ${values.name} è stato aggiunto con successo.`,
        });
        setIsOpen(false);

    } catch (error: any) {
         if (error.message.includes('email esiste già')) {
            form.setError('email', {
                type: 'manual',
                message: error.message,
            });
         } else {
            toast({
                variant: 'destructive',
                title: 'Errore',
                description: error.message || 'Si è verificato un errore durante la creazione dell\'utente.',
            });
         }
    } finally {
        setIsSubmitting(false);
    }
  }
  
  let title = isClientForm ? 'Crea nuovo cliente' : 'Crea nuovo utente';
  if (isMainCreator(currentUser)) {
    title = "Crea nuovo Creator";
  }
  
  const role = form.watch('role');

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
        const place = autocompleteRef.current.getPlace();
        if (place && place.formatted_address) {
            form.setValue('address', place.formatted_address, { shouldValidate: true, shouldDirty: true });
        }
         if (place && place.geometry && place.geometry.location) {
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
            description: 'Il tuo browser non supporta questa funzionalità.',
        });
        return;
    }

    setIsSubmitting(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            form.setValue('latitude', position.coords.latitude, { shouldDirty: true });
            form.setValue('longitude', position.coords.longitude, { shouldDirty: true });
            toast({
                title: 'Posizione acquisita',
                description: 'Le coordinate sono state inserite.',
            });
            setIsSubmitting(false);
        },
        () => {
            toast({
                variant: 'destructive',
                title: 'Errore di geolocalizzazione',
                description: 'Impossibile ottenere la posizione. Assicurati di aver dato i permessi.',
            });
            setIsSubmitting(false);
        }
    );
  };
  
  const isMainCreatorView = isMainCreator(currentUser);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if(!open) {
            form.reset({
              name: '',
              email: '',
              password: '',
              address: '',
              phone: '',
              role: defaultRole,
              allowedSectors: ['interventions', 'new_installations', 'surveys', 'maintenance'],
              clientNotes: '',
            });
            setShowPassword(false);
        }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Mario Rossi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="mario.rossi@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Password (default: starlink74)</FormLabel>
                  <div className="relative">
                      <FormControl>
                      <Input type={showPassword ? 'text' : 'password'} placeholder="********" {...field} />
                      </FormControl>
                      <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                      onClick={() => setShowPassword(prev => !prev)}
                      tabIndex={-1}
                      >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                  </div>
                  <FormMessage />
                  </FormItem>
              )}
            />
             {isClientForm ? (
                <input type="hidden" {...form.register("role")} value="Client" />
            ) : (
                <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Ruolo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isMainCreatorView}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleziona un ruolo" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {isMainCreator(currentUser) && <SelectItem value="Creator">Creator</SelectItem>}
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Operator">Operator</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            
            {role === 'Operator' && (
                 <FormField
                    control={form.control}
                    name="allowedSectors"
                    render={() => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base">Settori operativi</FormLabel>
                            </div>
                            <div className="space-y-2">
                            {allowedSectors.map((item) => (
                                <FormField
                                key={item.id}
                                control={form.control}
                                name="allowedSectors"
                                render={({ field }) => {
                                    return (
                                    <FormItem
                                        key={item.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(item.id)}
                                            onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), item.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                        (value) => value !== item.id
                                                    )
                                                    )
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        {item.label}
                                        </FormLabel>
                                    </FormItem>
                                    )
                                }}
                                />
                            ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
            )}
            
            {role !== 'Creator' && <>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input placeholder="Numero di telefono" {...field} />
                      </FormControl>
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
                        <FormLabel>Indirizzo</FormLabel>
                        <Button type="button" variant="ghost" size="sm" onClick={handleGeolocate} disabled={isSubmitting}>
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
                                        placeholder="Cerca un indirizzo..."
                                        onBlur={field.onBlur}
                                        onChange={field.onChange}
                                    />
                                </Autocomplete>
                            ) : (
                               <Input
                                    {...field}
                                    placeholder="Cerca un indirizzo..."
                                    disabled
                                />
                            )}
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {isClientForm && (
                  <FormField
                    control={form.control}
                    name="clientNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appunti Cliente</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Aggiungi note sul cliente..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
            </>}
            <DialogFooter className="flex-col-reverse sm:flex-row pt-4">
                <DialogClose asChild>
                    <Button variant="outline" disabled={isSubmitting}>Annulla</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    Crea {isMainCreatorView ? 'creator' : isClientForm ? 'cliente' : 'utente'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
