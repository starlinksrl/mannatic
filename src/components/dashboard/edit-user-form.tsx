

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
import { Pencil, Eye, EyeOff } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useUser } from '@/contexts/user-context';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Checkbox } from '../ui/checkbox';

const libraries: ('places' | 'drawing' | 'geometry' | 'localContext' | 'visualization')[] = ['places'];

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
  address: z.string().optional(),
  phone: z.string().optional(),
  allowedSectors: z.array(z.string()).optional(),
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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  const avatarUrl = form.watch('avatarUrl');
  const role = form.watch('role');
  
  const isEditingOwnProfile = currentUser?.id === user?.id;

  useEffect(() => {
    if (user) {
        form.reset({
            name: user.name,
            email: user.email,
            role: user.role,
            password: '',
            avatarUrl: user.avatarUrl,
            address: user.address || '',
            phone: user.phone || '',
            allowedSectors: user.allowedSectors || []
        })
    }
  }, [user, form]);

  if(!user) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToUpdate: Partial<User> = {
        name: values.name,
        email: values.email,
        role: values.role as UserRole,
        avatarUrl: values.avatarUrl,
        address: values.address,
        phone: values.phone,
        allowedSectors: values.role === 'Operator' ? (values.allowedSectors as AllowedSector[]) : undefined
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
    }
    setIsOpen(false);
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('avatarUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const canEditRole = currentUser?.role === 'Admin' || currentUser?.role === 'Creator';
  const canEditEmail = (currentUser?.role === 'Admin' || currentUser?.role === 'Creator');
  const canEditPassword = (currentUser?.role === 'Admin' || currentUser?.role === 'Creator') && user.role !== 'Client';

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
        const place = autocompleteRef.current.getPlace();
        if (place && place.formatted_address) {
            form.setValue('address', place.formatted_address, { shouldValidate: true, shouldDirty: true });
            inputRef.current?.focus();
        }
    }
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
             <div className="flex justify-center">
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
                            onChange={handleFileChange}
                            accept="image/*"
                        />
                    </FormControl>
                </div>
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
                  <FormLabel>Indirizzo</FormLabel>
                    <FormControl>
                        {isLoaded ? (
                            <Autocomplete
                                onLoad={(autocomplete) => {
                                    autocompleteRef.current = autocomplete;
                                }}
                                onPlaceChanged={handlePlaceChanged}
                                fields={['formatted_address']}
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
          </form>
        </Form>
        </div>
        </ScrollArea>
        <DialogFooter className="flex-col-reverse sm:flex-row p-6 pt-0 border-t">
            <DialogClose asChild>
                <Button variant="outline">Annulla</Button>
            </DialogClose>
            <Button type="submit" form="edit-user-form">Salva modifiche</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



