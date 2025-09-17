'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Separator } from '@/components/ui/separator';

const SMTP_STORAGE_KEY = 'smtp_settings';

const formSchema = z.object({
  smtpHost: z.string().min(1, { message: 'Host SMTP obbligatorio.' }),
  smtpPort: z.coerce.number().min(1, { message: 'Porta SMTP obbligatoria.' }),
  smtpUser: z.string().min(1, { message: 'Username obbligatorio.' }),
  smtpPass: z.string().min(1, { message: 'Password obbligatoria.' }),
  senderEmail: z.string().email({ message: 'Email mittente non valida.' }),
});

export default function SettingsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      senderEmail: '',
    },
  });

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, router]);
  
  useEffect(() => {
    const savedSettings = localStorage.getItem(SMTP_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        form.reset(parsedSettings);
      } catch (error) {
        console.error("Failed to parse SMTP settings from localStorage", error);
      }
    }
  }, [form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    localStorage.setItem(SMTP_STORAGE_KEY, JSON.stringify(values));
    toast({
      title: 'Impostazioni salvate',
      description: 'Le impostazioni del server SMTP sono state salvate con successo nel browser.',
    });
  }
  
  function onTestConnection() {
     // In a real app, you would try to connect to the SMTP server
    toast({
      title: 'Test connessione',
      description: 'Connessione al server SMTP riuscita! (Simulazione)',
    });
  }

  if (!user || user.role !== 'Admin') {
    return null;
  }

  return (
    <>
      <Header title="Impostazioni" />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Configurazione Server SMTP</CardTitle>
            <CardDescription>
              Inserisci i dettagli del tuo server SMTP per abilitare l'invio di email, come le notifiche e il reset password. Le impostazioni verranno salvate localmente nel browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <FormField
                      control={form.control}
                      name="smtpHost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Host SMTP</FormLabel>
                          <FormControl>
                            <Input placeholder="smtp.example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="smtpPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Porta SMTP</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="587" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                <Separator />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <FormField
                      control={form.control}
                      name="smtpUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Il tuo username SMTP" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="smtpPass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                 <Separator />
                  <FormField
                      control={form.control}
                      name="senderEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Mittente</FormLabel>
                          <FormControl>
                            <Input placeholder="noreply@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onTestConnection}>Testa Connessione</Button>
                    <Button type="submit">Salva Impostazioni</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
