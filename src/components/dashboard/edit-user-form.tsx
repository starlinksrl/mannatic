

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, UserRole, AllowedSector } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateUser } from '@/lib/data';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Pencil, Eye, EyeOff, MapPin, Loader } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useUser } from '@/contexts/user-context';
import { Autocomplete, useLoadScript } from '@react-google-maps/api';
import { Checkbox } from '../ui/checkbox';
import { useMaps } from '@/contexts/maps-context';
import { Textarea } from '../ui/textarea';

const allowedSectors: { id: AllowedSector; label: string }[] = [
    { id: 'interventions', label: 'Interventi' },
    { id: 'surveys', label: 'Sopralluoghi' },
    { id: 'maintenance', label: 'Manutenzioni' },
];

const formSchema = z.object({
  name: z.string().min(2, { message: 'Il nome deve contenere almeno 2 caratteri.' }),
  email: z.string().email({ message: 'Inserisci un indirizzo email valido.' }),
  role: z.enum(['Admin', 'Operator', 'Client', 'Creator'], { required_error: 'Il ruolo è obbligatorio.' }),
  password: z.string().min(8, { message: "La nuova password deve contenere almeno 8 caratteri." }).optional().or(z.literal('')),
  avatarUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  vatNumber: z.string().optional(),
  taxCode: z.string().optional(),
  uniqueCode: z.string().optional(),
  allowedSectors: z.array(z.string()).optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  clientNotes: z.string().optional(),
});

interface EditUserFormProps {
  user: User | null;
  onUserUpdated: (user: User) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function EditUserForm({ user, onUserUpdated, isOpen, setIsOpen }: EditUserFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { isLoaded } = useMaps();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  const avatarUrl = form.watch('avatarUrl');
  const logoUrl = form.watch('logoUrl');
  const role = form.watch('role');
  const latitude = form.watch('latitude');
  const longitude = form.watch('longitude');
  
  const isEditingOwnProfile = currentUser?.id === user?.id;

  useEffect(() => {
    if (user) {
        form.reset({
            name: user.name,
            email: user.email,
            role: user.role,
            password: '',
            avatarUrl: user.avatarUrl,
            logoUrl: user.logoUrl || '',
            address: user.address || '',
            phone: user.phone || '',
            vatNumber: user.vatNumber || '',
            taxCode: user.taxCode || '',
            uniqueCode: user.uniqueCode || '',
            allowedSectors: user.allowedSectors || [],
            latitude: user.latitude || null,
            longitude: user.longitude || null,
            clientNotes: user.clientNotes || '',
        })
    }
  }, [user, form]);

  if(!user) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
        const dataToUpdate: Partial<User> = {
            name: values.name,
            email: values.email,
            role: values.role as UserRole,
            avatarUrl: values.avatarUrl,
            logoUrl: values.logoUrl,
            address: values.address,
            phone: values.phone,
            vatNumber: values.vatNumber,
            taxCode: values.taxCode,
            uniqueCode: values.uniqueCode,
            allowedSectors: values.role === 'Operator' ? (values.allowedSectors as AllowedSector[]) : undefined,
            latitude: values.latitude,
            longitude: values.longitude,
            clientNotes: values.role === 'Client' ? values.clientNotes : undefined,
        };

        if (values.password && values.password.trim() !== '') {
            dataToUpdate.password = values.password;
        }
        
        const updatedUser = await updateUser(user!.id, dataToUpdate);
        
        if (updatedUser) {
            onUserUpdated(updatedUser);
            toast({
            title: 'Utente aggiornato',
            description: `L'utente ${values.name} è stato aggiornato con successo.`,
            });
             setIsOpen(false);
        }
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Errore',
            description: error.message || 'Si è verificato un errore durante l\'aggiornamento dell\'utente.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  }
  
  const handleLogoClick = () => {
    logoInputRef.current?.click();
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'logoUrl') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue(field, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const canEditRole = currentUser?.role === 'Creator' || (currentUser?.role === 'Admin' && user.role !== 'Creator');
  const canEditEmail = (currentUser?.role === 'Admin' || currentUser?.role === 'Creator');
  const canEditPassword = (currentUser?.role === 'Admin' || currentUser?.role === 'Creator' || user?.role === 'Client');

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


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{isEditingOwnProfile ? 'Modifica il tuo profilo' : 'Modifica utente'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
        <div className="p-6">
        <Form {...form}>
          <form id="edit-user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="flex justify-center gap-4">
                <div className="relative">
                    <Avatar className="h-24 w-24 mb-4 cursor-pointer" onClick={handleAvatarClick}>
                        <AvatarImage src={avatarUrl} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Button type="button" variant="outline" size="icon" className="absolute bottom-4 right-0 rounded-full h-8 w-8" onClick={handleAvatarClick}>
                        <Pencil className="h-4 w-4"/>
                    </Button>
                    <FormControl>
                        <Input 
                            type="file" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={(e) => handleFileChange(e, 'avatarUrl')}
                            accept="image/*"
                        />
                    </FormControl>
                </div>
                {role === 'Creator' && (
                    <div className="relative">
                        <Avatar className="h-24 w-24 mb-4 cursor-pointer border-dashed border-2" onClick={handleLogoClick}>
                            <AvatarImage src={logoUrl} alt="Logo" />
                            <AvatarFallback>Logo</AvatarFallback>
                        </Avatar>
                        <Button type="button" variant="outline" size="icon" className="absolute bottom-4 right-0 rounded-full h-8 w-8" onClick={handleLogoClick}>
                            <Pencil className="h-4 w-4"/>
                        </Button>
                        <FormControl>
                            <Input 
                                type="file" 
                                className="hidden" 
                                ref={logoInputRef} 
                                onChange={(e) => handleFileChange(e, 'logoUrl')}
                                accept="image/*"
                            />
                        </FormControl>
                    </div>
                )}
            </div>
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
                    <Input placeholder="mario.rossi@example.com" {...field} disabled={!canEditEmail} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {canEditPassword && (
                 <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nuova Password (lascia vuoto per non modificare)</FormLabel>
                        <div className="relative">
                            <FormControl>
                            <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
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
            )}

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruolo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!canEditRole}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un ruolo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currentUser?.role === 'Creator' && <SelectItem value="Creator">Creator</SelectItem>}
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Operator">Operator</SelectItem>
                      <SelectItem value="Client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === 'Operator' && canEditRole && (
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
             {role === 'Creator' && (
                <>
                    <FormField control={form.control} name="vatNumber" render={({ field }) => (<FormItem><FormLabel>Partita IVA</FormLabel><FormControl><Input placeholder="IT..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="taxCode" render={({ field }) => (<FormItem><FormLabel>Codice Fiscale</FormLabel><FormControl><Input placeholder="Codice fiscale..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="uniqueCode" render={({ field }) => (<FormItem><FormLabel>Codice Univoco (SDI)</FormLabel><FormControl><Input placeholder="Codice SDI" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                </>
            )}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input placeholder="Numero di telefono" {...field} value={field.value ?? ''}/>
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
                                    value={field.value ?? ''}
                                />
                            </Autocomplete>
                        ) : (
                           <Input
                                {...field}
                                placeholder="Cerca un indirizzo..."
                                disabled
                                value={field.value ?? ''}
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
                        <Input {...field} disabled value={field.value?.toFixed(6) ?? 'N/D'} />
                      </FormControl>
                      <FormMessage />
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
                        <Input {...field} disabled value={field.value?.toFixed(6) ?? 'N/D'} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               {role === 'Client' && (
                  <FormField
                    control={form.control}
                    name="clientNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appunti Cliente</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Note varie sul cliente..." {...field} value={field.value ?? ''} />
                        </FormControl>
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
            <Button type="submit" form="edit-user-form" disabled={isSubmitting}>
               {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
               Salva modifiche
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




    