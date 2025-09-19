'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { sendTestEmail, saveSmtpSettings } from '@/app/actions';
import { Loader, AlertTriangle } from 'lucide-react';
import { Company } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  smtpHost: z.string().min(1, { message: 'Host SMTP obbligatorio.' }),
  smtpPort: z.coerce.number().min(1, { message: 'Porta SMTP obbligatoria.' }),
  smtpUser: z.string().min(1, { message: 'Username obbligatorio.' }),
  smtpPass: z.string().min(1, { message: 'Password obbligatoria.' }),
  senderEmail: z.string().email({ message: 'Email mittente non valida.' }),
  recipientEmail: z.string().email({ message: 'Email destinatario non valida.' }),
});

export default function SettingsPage() {
  const { user, currentCompany, setCurrentCompany } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testError, setTestError] = useState<string | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      senderEmail: '',
      recipientEmail: '',
    },
  });

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, router]);
  
  useEffect(() => {
    if (currentCompany) {
      form.reset({
        smtpHost: currentCompany.smtpHost || '',
        smtpPort: currentCompany.smtpPort || 587,
        smtpUser: currentCompany.smtpUser || '',
        smtpPass: currentCompany.smtpPass || '',
        senderEmail: currentCompany.senderEmail || '',
        recipientEmail: testRecipient || ''
      });
    }
  }, [currentCompany, form, testRecipient]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentCompany) return;
    setIsSaving(true);
    setTestError(null);
    
    const settingsToSave: Partial<Company> = {
      smtpHost: values.smtpHost,
      smtpPort: values.smtpPort,
      smtpUser: values.smtpUser,
      smtpPass: values.smtpPass,
      senderEmail: values.senderEmail,
    };

    const updatedCompany = await saveSmtpSettings(currentCompany.id, settingsToSave);

    if (updatedCompany) {
        setCurrentCompany(updatedCompany);
        setTestRecipient(values.recipientEmail); // Keep test email in state
        toast({
          title: 'Impostazioni salvate',
          description: 'Le impostazioni del server SMTP sono state salvate nel database.',
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Errore',
            description: 'Impossibile salvare le impostazioni SMTP.',
        });
    }
    setIsSaving(false);
  }
  
  async function onTestConnection() {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        variant: 'destructive',
        title: 'Campi obbligatori mancanti',
        description: 'Per favore, compila tutti i campi prima di testare la connessione.',
      });
      return;
    }

    setIsTesting(true);
    setTestError(null);
    const values = form.getValues();
    
    const result = await sendTestEmail({
      recipientEmail: values.recipientEmail,
      maintenanceDetails: 'Controllo trimestrale del sistema di condizionamento.',
      nextDueDate: new Date().toLocaleDateString('it-IT'),
      smtpConfig: {
        host: values.smtpHost,
        port: values.smtpPort,
        user: values.smtpUser,
        pass: values.smtpPass,
        from: values.senderEmail,
      },
    });

    if (result.success) {
      toast({
        title: 'Test connessione riuscito!',
        description: `Email di prova inviata con successo a ${values.recipientEmail}.`,
      });
    } else {
      setTestError(result.error || 'Controlla le impostazioni SMTP e la connessione di rete.');
    }
    setIsTesting(false);
  }

  if (!user || user.role !== 'Admin') {
    return null;
  }

  return (
    <>
      <Header title="Impostazioni" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <Card>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Configurazione Notifiche Email (SMTP)</CardTitle>
                <CardDescription>
                  Inserisci i dettagli del tuo provider SMTP per l'invio delle notifiche. Le credenziali vengono salvate in modo sicuro nel database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                            <FormLabel>Username SMTP</FormLabel>
                            <FormControl>
                              <Input placeholder="Il tuo username" {...field} autoComplete="username" />
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
                            <FormLabel>Password SMTP</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} autoComplete="new-password"/>
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
                        name="senderEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Mittente Notifiche</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="noreply@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="recipientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Destinatario Test</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="test@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={onTestConnection} disabled={isTesting || isSaving}>
                    {isTesting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    Testa Notifica
                  </Button>
                  <Button type="submit" disabled={isSaving || isTesting}>
                      {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                      Salva Impostazioni
                  </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
        
        {testError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Test connessione fallito</AlertTitle>
            <AlertDescription>
              {testError}
            </AlertDescription>
          </Alert>
        )}
      </main>
    </>
  );
}
