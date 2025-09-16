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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateUser } from '@/lib/data';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Pencil } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Il nome deve contenere almeno 2 caratteri.' }),
  email: z.string().email({ message: 'Inserisci un indirizzo email valido.' }),
  role: z.enum(['Admin', 'Operator', 'Client'], { required_error: 'Il ruolo è obbligatorio.' }),
  password: z.string().optional(),
  avatarUrl: z.string().optional(),
});

interface EditUserFormProps {
  children: React.ReactNode;
  user: User;
  onUserUpdated: (user: User) => void;
}

export function EditUserForm({ children, user, onUserUpdated }: EditUserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: user.name,
        email: user.email,
        role: user.role,
        password: '',
        avatarUrl: user.avatarUrl,
    },
  });

  const avatarUrl = form.watch('avatarUrl');

  useEffect(() => {
    form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        password: '',
        avatarUrl: user.avatarUrl
    })
  }, [user, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const updatedUser = updateUser(user.id, {
        ...values,
        role: values.role as UserRole,
    });
    
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifica utente</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>Nuova Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Lascia vuoto per non modificare" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      <SelectItem value="Client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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
