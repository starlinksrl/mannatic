
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';
import { Separator } from '@/components/ui/separator';
import { Loader, Settings, Upload, Save, AlertCircle, Send } from 'lucide-react';
import { getAppConfiguration, updateAppConfiguration } from '@/lib/data';
import { AppConfiguration } from '@/lib/types';
import Image from 'next/image';
import { sendTestEmailAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  appName: z.string().optional(),
  appLogoUrl: z.string().optional(),
  defaultSmtpHost: z.string().optional(),
  defaultSmtpPort: z.coerce.number().optional(),
  defaultSmtpUser: z.string().optional(),
  defaultSmtpPass: z.string().optional(),
  defaultSenderEmail: z.string().email({ message: "L'email del mittente non è valida." }).optional().or(z.literal('')),
  gcsProjectId: z.string().optional(),
  gcsClientEmail: z.string().optional(),
  gcsPrivateKey: z.string().optional(),
  gcsBucketName: z.string().optional(),
  testRecipientEmail: z.string().email({ message: "L'email del destinatario non è valida." }).optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

export default function CreatorSettingsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: '',
      appLogoUrl: '',
      defaultSmtpHost: '',
      defaultSmtpPort: 587,
      defaultSmtpUser: '',
      defaultSmtpPass: '',
      defaultSenderEmail: '',
      gcsProjectId: '',
      gcsClientEmail: '',
      gcsPrivateKey: '',
      gcsBucketName: '',
      testRecipientEmail: '',
    },
  });

  useEffect(() => {
    if (user && user.role !== 'Creator') {
      router.push('/dashboard');
      return;
    }

    async function loadConfig() {
      setIsLoading(true);
      const config = await getAppConfiguration();
      if (config) {
        form.reset({
          ...config,
          gcsPrivateKey: config.gcsPrivateKey ? '••••••••' : '', // Mask private key
        });
      }
      setIsLoading(false);
    }

    if (user) {
      loadConfig();
    }
  }, [user, router, form]);

  const appLogoUrl = form.watch('appLogoUrl');

  const onSubmit = async (values: FormData) => {
    setIsSaving(true);
    
    // Don't save the masked private key unless it has been changed
    const configToSave: Partial<FormData> = { ...values };
    if (values.gcsPrivateKey === '••••••••') {
      delete configToSave.gcsPrivateKey;
    }
    
    const { testRecipientEmail, ...finalConfig } = configToSave;

    const result = await updateAppConfiguration(finalConfig);
    if (result) {
      toast({
        title: 'Configurazione salvata',
        description: 'Le impostazioni globali sono state aggiornate.',
      });
       if (result.gcsPrivateKey) {
         form.setValue('gcsPrivateKey', '••••••••');
       }
    } else {
      toast({
        variant: 'destructive',
        title: 'Errore di salvataggio',
        description: "Impossibile salvare la configurazione dell'app.",
      });
    }
    setIsSaving(false);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('appLogoUrl', reader.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSmtpTest = async () => {
    const values = form.getValues();
    if (!values.testRecipientEmail || !values.defaultSmtpHost || !values.defaultSenderEmail) {
        toast({ variant: 'destructive', title: 'Campi Mancanti', description: 'Per inviare un test, inserisci Host, Email Mittente e Email Destinatario Test.' });
        return;
    }
    setIsTestingSmtp(true);
    const result = await sendTestEmailAction({
        recipientEmail: values.testRecipientEmail,
        smtpConfig: {
            host: values.defaultSmtpHost,
            port: values.defaultSmtpPort || 587,
            user: values.defaultSmtpUser || '',
            pass: values.defaultSmtpPass || '',
            from: values.defaultSenderEmail,
        }
    });
    if (result.success) {
        toast({ title: 'Email di prova inviata!', description: `Controlla la casella di posta di ${values.testRecipientEmail}.`});
    } else {
        toast({ variant: 'destructive', title: 'Invio fallito', description: result.error || 'Si è verificato un errore sconosciuto.'});
    }
    setIsTestingSmtp(false);
  }

  if (isLoading || !user) {
    return (
      <>
        <Header title="App Configuration" />
        <div className="flex flex-1 items-center justify-center">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }
  
  if(user.role !== 'Creator') return null;

  return (
    <>
      <Header title="App Configuration" />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Branding Applicazione</CardTitle>
                <CardDescription>Imposta il nome e il logo globali per MannaTic.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="appName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Applicazione</FormLabel>
                      <FormControl>
                        <Input placeholder="MannaTic" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormItem>
                    <FormLabel>Logo Applicazione</FormLabel>
                    <div className="flex items-center gap-4">
                        {appLogoUrl && <Image src={appLogoUrl} alt="App Logo" width={40} height={40} className="rounded-md object-contain border p-1" />}
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                           <Upload className="mr-2" /> Carica Logo
                        </Button>
                        <FormControl>
                            <Input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileChange}
                                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                            />
                        </FormControl>
                    </div>
                </FormItem>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SMTP di Default</CardTitle>
                <CardDescription>
                  Queste impostazioni SMTP verranno usate come predefinite per ogni nuova azienda creata.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="defaultSmtpHost"
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
                        name="defaultSmtpPort"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="defaultSmtpUser"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username SMTP</FormLabel>
                            <FormControl>
                              <Input placeholder="Username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="defaultSmtpPass"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password SMTP</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                    <FormField
                        control={form.control}
                        name="defaultSenderEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Mittente di Default</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="noreply@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                <Separator />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                     <FormField
                        control={form.control}
                        name="testRecipientEmail"
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
                    <Button type="button" variant="outline" onClick={handleSmtpTest} disabled={isTestingSmtp}>
                        {isTestingSmtp ? <Loader className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                        Invia Email di Prova
                    </Button>
                 </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Google Cloud Storage (Universale)</CardTitle>
                <CardDescription>
                  Configura il bucket per il salvataggio di file e allegati.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Come connettere un Bucket</AlertTitle>
                    <AlertDescription>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Vai in Google Cloud su "IAM & Admin" &gt; "Service Accounts".</li>
                            <li>Seleziona un Service Account o creane uno nuovo.</li>
                            <li>Assicurati che abbia il ruolo <b>"Storage Object Admin"</b>.</li>
                            <li>Vai nella tab "Keys", clicca "Add Key" &gt; "Create new key", scegli <b>JSON</b> e crea.</li>
                            <li>Un file JSON verrà scaricato. Aprilo e copia i valori `project_id`, `client_email` e `private_key` nei campi sottostanti.</li>
                        </ol>
                    </AlertDescription>
                 </Alert>
                <FormField
                  control={form.control}
                  name="gcsProjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project ID</FormLabel>
                      <FormControl>
                        <Input placeholder="il-tuo-project-id" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gcsClientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email del Service Account</FormLabel>
                      <FormControl>
                        <Input placeholder="nome-sa@il-tuo-project-id.iam.gserviceaccount.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="gcsPrivateKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chiave Privata del Service Account</FormLabel>
                      <FormControl>
                        <Textarea placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="gcsBucketName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome del Bucket GCS</FormLabel>
                      <FormControl>
                        <Input placeholder="nome-del-tuo-bucket" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <Button type="button" variant="outline" disabled>
                    Testa Connessione al Bucket
                </Button>
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                  Salva Configurazione
                </Button>
            </div>
          </form>
        </Form>
      </main>
    </>
  );
}
