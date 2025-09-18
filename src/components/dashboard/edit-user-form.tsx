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
import { User, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateUser } from '@/lib/data';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Pencil, Eye, EyeOff } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Il nome deve contenere almeno 2 caratteri.' }),
  email: z.string().email({ message: 'Inserisci un indirizzo email valido.' }),
  role: z.enum(['Admin', 'Operator', 'Client'], { required_error: 'Il ruolo è obbligatorio.' }),
  password: z.string().optional(),
  avatarUrl: z.string().optional(),
});

interface EditUserFormProps {
  user: User | null;
  onUserUpdated: (user: User) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function EditUserForm({ user, onUserUpdated, isOpen, setIsOpen }: EditUserFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  const avatarUrl = form.watch('avatarUrl');

  useEffect(() => {
    if (user) {
        form.reset({
            name: user.name,
            email: user.email,
            role: user.role,
            password: '',
            avatarUrl: user.avatarUrl
        })
    }
  }, [user, form]);

  if(!user) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const updatedUser = await updateUser(user!.id, {
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
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if(!open) {
        setShowPassword(false);
      }
    }}>
      <DialogContent className="sm:max-w-[425px] grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Modifica utente</DialogTitle>
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
                  <div className="relative">
                    <FormControl>
                      <Input type={showPassword ? 'text' : 'password'} placeholder="Lascia vuoto per non modificare" {...field} />
                    </FormControl>
                     <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                      onClick={() => setShowPassword(prev => !prev)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
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
