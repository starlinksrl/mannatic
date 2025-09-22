
'use client';

import React, { useState } from 'react';
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
import { User, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addUser } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { Eye, EyeOff } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Il nome deve contenere almeno 2 caratteri.' }),
  email: z.string().email({ message: 'Inserisci un indirizzo email valido.' }),
  role: z.enum(['Admin', 'Operator', 'Client'], { required_error: 'Il ruolo è obbligatorio.' }),
  password: z.string().min(8, { message: 'La password deve contenere almeno 8 caratteri.'}),
  address: z.string().optional(),
  phone: z.string().optional(),
});

interface AddUserFormProps {
  children: React.ReactNode;
  onUserAdded: (user: User) => void;
  defaultRole?: 'Admin' | 'Operator' | 'Client';
  isClientForm?: boolean;
}

export function AddUserForm({ children, onUserAdded, defaultRole, isClientForm = false }: AddUserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useUser();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      address: '',
      phone: '',
      role: defaultRole
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentCompany) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Nessuna azienda selezionata.' });
        return;
    }

    const newUser = await addUser({
        name: values.name,
        email: values.email,
        role: values.role as UserRole,
        password: values.password,
        companyId: currentCompany.id,
        address: values.address,
        phone: values.phone
    });
    
    onUserAdded(newUser);
    toast({
      title: `${isClientForm ? 'Cliente' : 'Utente'} creato`,
      description: `${isClientForm ? 'Il cliente' : 'L\'utente'} ${values.name} è stato aggiunto con successo.`,
    });
    setIsOpen(false);
    form.reset();
  }
  
  const title = isClientForm ? 'Crea nuovo cliente' : 'Crea nuovo utente';

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
              role: defaultRole
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
                  <FormLabel>Password</FormLabel>
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
                    <Input placeholder="Via, Città, CAP" {...field} />
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
