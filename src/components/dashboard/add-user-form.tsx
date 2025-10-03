

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, UserRole, AllowedSector } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addUser, getUserByEmail } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { Eye, EyeOff } from 'lucide-react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Checkbox } from '../ui/checkbox';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const libraries: ('places' | 'drawing' | 'geometry' | 'localContext' | 'visualization')[] = ['places'];

const allowedSectors: { id: AllowedSector; label: string }[] = [
    { id: 'interventions', label: 'Interventi' },
    { id: 'surveys', label: 'Sopralluoghi' },
    { id: 'maintenance', label: 'Manutenzioni' },
];

const formSchema = z.object({
  name: z.string().min(2, { message: 'Il nome deve contenere almeno 2 caratteri.' }),
  email: z.string().email({ message: 'Inserisci un indirizzo email valido.' }),
  role: z.enum(['Admin', 'Operator', 'Client'], { required_error: 'Il ruolo è obbligatorio.' }),
  password: z.string().min(8, { message: 'La password deve contenere almeno 8 caratteri.'}).optional().or(z.literal('')),
  address: z.string().optional(),
  phone: z.string().optional(),
  allowedSectors: z.array(z.string()).optional(),
});

interface AddUserFormProps {
  children: React.ReactNode;
  onUserAdded: (user?: User) => void;
  defaultRole?: 'Admin' | 'Operator' | 'Client';
  isClientForm?: boolean;
}

export function AddUserForm({ children, onUserAdded, defaultRole, isClientForm = false }: AddUserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      address: '',
      phone: '',
      role: defaultRole,
      allowedSectors: ['interventions', 'surveys', 'maintenance'], // Default to all for new operators
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentCompany) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Nessuna azienda selezionata.' });
        return;
    }
    
    try {
        let userId: string;
        if (values.role === 'Client') {
            const existingClient = await getUserByEmail(values.email);
            if (existingClient) {
                toast({ variant: 'destructive', title: 'Errore', description: 'Un cliente con questa email esiste già.' });
                return;
            }
            // For clients, we just add them to our DB without creating an Auth user
            await addUser({
                name: values.name,
                email: values.email,
                role: 'Client',
                companyId: currentCompany.id,
                address: values.address,
                phone: values.phone
            });
        } else {
             // For Admin/Operator, create user in Firebase Auth
            const password = values.password || 'starlink74';
            if (password.length < 8) {
                form.setError('password', { message: 'La password deve contenere almeno 8 caratteri.' });
                return;
            }
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, password);
            userId = userCredential.user.uid;
            await addUser({
                id: userId,
                name: values.name,
                email: values.email,
                role: values.role as UserRole,
                companyId: currentCompany.id,
                address: values.address,
                phone: values.phone,
                allowedSectors: values.role === 'Operator' ? (values.allowedSectors as AllowedSector[]) : undefined
            });
        }
        
        onUserAdded();
        toast({
          title: `${isClientForm ? 'Cliente' : 'Utente'} creato`,
          description: `${isClientForm ? 'Il cliente' : 'L\'utente'} ${values.name} è stato aggiunto con successo.`,
        });
        setIsOpen(false);
        form.reset();
    } catch (error: any) {
         let description = 'Si è verificato un errore durante la creazione dell\'utente.';
        if (error.code === 'auth/email-already-in-use') {
            description = 'Questa email è già in uso da un utente con password. Prova con un\'altra email.';
        } else if (error.code === 'auth/weak-password') {
            description = 'La password è troppo debole. Deve essere di almeno 6 caratteri.';
        }
        toast({
            variant: 'destructive',
            title: 'Errore',
            description: description,
        });
    }
  }
  
  const title = isClientForm ? 'Crea nuovo cliente' : 'Crea nuovo utente';
  const role = form.watch('role');

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
              allowedSectors: ['interventions', 'surveys', 'maintenance'],
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
            {role !== 'Client' && (
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
            )}
             {isClientForm ? (
                <input type="hidden" {...form.register("role")} value="Client" />
            ) : (
                <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Ruolo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleziona un ruolo" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
            <DialogFooter className="flex-col-reverse sm:flex-row pt-4">
                <DialogClose asChild>
                    <Button variant="outline">Annulla</Button>
                </DialogClose>
                <Button type="submit">Crea {isClientForm ? 'cliente' : 'utente'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
