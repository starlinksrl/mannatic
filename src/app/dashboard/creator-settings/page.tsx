
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
import { Loader, Settings, Upload, Save, AlertCircle, Send, TestTubeDiagonal, Mail, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getAppConfiguration, updateAppConfiguration } from '@/lib/data';
import { AppConfiguration } from '@/lib/types';
import Image from 'next/image';
import { sendTestEmailAction, testGcsConnectionAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  appName: z.string().optional(),
  appLogoUrl: z.string().optional(),
  resendApiKey: z.string().optional(),
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
  const [isTestingGcs, setIsTestingGcs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: '',
      appLogoUrl: '',
      resendApiKey: '',
      defaultSenderEmail: '',
      gcsProjectId: '',
      gcsClientEmail: '',
      gcsPrivateKey: '',
      gcsBucketName: '',
      testRecipientEmail: '',
    },
  });
  
  const originalPrivateKey = useRef('');
  const originalResendKey = useRef('');

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
          appName: config.appName ?? '',
          appLogoUrl: config.appLogoUrl ?? '',
          resendApiKey: config.resendApiKey ? '••••••••' : '',
          defaultSenderEmail: config.defaultSenderEmail ?? '',
          gcsProjectId: config.gcsProjectId ?? '',
          gcsClientEmail: config.gcsClientEmail ?? '',
          gcsPrivateKey: config.gcsPrivateKey ? '••••••••' : '',
          gcsBucketName: config.gcsBucketName ?? '',
          testRecipientEmail: '', // This should not be persisted
        });
        originalPrivateKey.current = config.gcsPrivateKey || '';
        originalResendKey.current = config.resendApiKey || '';
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
    
    const configToSave: Partial<FormData> = { ...values };
    if (values.gcsPrivateKey === '••••••••') {
      configToSave.gcsPrivateKey = originalPrivateKey.current;
    } else {
       originalPrivateKey.current = values.gcsPrivateKey || '';
    }

    if (values.resendApiKey === '••••••••') {
      configToSave.resendApiKey = originalResendKey.current;
    } else {
       originalResendKey.current = values.resendApiKey || '';
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
       if (result.resendApiKey) {
         form.setValue('resendApiKey', '••••••••');
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
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const { compressLogo } = await import('@/lib/image-compression');
        const compressed = await compressLogo(file);
        form.setValue('appLogoUrl', compressed, { shouldDirty: true });
      } catch (err) {
        console.warn('Logo compression fallback:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          form.setValue('appLogoUrl', reader.result as string, { shouldDirty: true });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleResendTest = async () => {
    const values = form.getValues();
    const apiKey = values.resendApiKey === '••••••••' ? originalResendKey.current : values.resendApiKey;

    if (!values.testRecipientEmail) {
        toast({ variant: 'destructive', title: 'Destinatario mancante', description: 'Inserisci l\'indirizzo email a cui inviare la prova.' });
        return;
    }
    setIsTestingSmtp(true);
    const result = await sendTestEmailAction({
        recipientEmail: values.testRecipientEmail,
        resendConfig: (apiKey && values.defaultSenderEmail) ? {
            apiKey: apiKey,
            from: values.defaultSenderEmail,
        } : undefined
    });
    if (result.success) {
        toast({ title: 'Email di prova inviata!', description: `Controlla la casella di posta di ${values.testRecipientEmail}.`});
    } else {
        toast({ variant: 'destructive', title: 'Invio fallito', description: result.error || 'Si è verificato un errore sconosciuto.'});
    }
    setIsTestingSmtp(false);
  }
  
  const handleBucketTest = async () => {
    setIsTestingGcs(true);
    try {
      const { uploadFileToSupabase } = await import('@/lib/supabase-storage');
      const testRes = await uploadFileToSupabase('data:text/plain;base64,VGVzdA==', 'test-bucket.txt', 'health_check');
      if (!testRes.error && testRes.url) {
        toast({ title: 'Connessione a Supabase Storage riuscita!', description: 'Un file di test è stato scritto ed il bucket privato è perfettamente funzionante.' });
      } else {
        toast({ variant: 'destructive', title: 'Connessione al Bucket fallita', description: testRes.error || 'Impossibile accedere al bucket Supabase.' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Errore Test Storage', description: e.message || 'Si è verificato un errore.' });
    } finally {
      setIsTestingGcs(false);
    }
  };

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
                        <Input placeholder="MannaTic" {...field} value={field.value ?? ''} />
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
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      Sistema Email (Dominio mannatec.it)
                    </CardTitle>
                    <CardDescription>
                      Tutte le email (invito utenti, reset password, notifiche ticket e riepiloghi) vengono inviate tramite il server di posta del dominio.
                    </CardDescription>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Dominio Attivo
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-muted/40 border text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs block">Server SMTP</span>
                    <strong className="font-mono text-xs">mail.mannatec.it</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block">Porta &amp; Sicurezza</span>
                    <strong className="font-mono text-xs">465 (SSL / TLS)</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block">Account Mittente</span>
                    <strong className="font-mono text-xs text-primary">noreply@mannatec.it</strong>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-sm flex items-center gap-1.5 text-foreground">
                    <Send className="h-4 w-4 text-primary" />
                    Testa Invio Immediato
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name="testRecipientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Destinatario per il Test</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="latuaemail@esempio.com" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="default" onClick={handleResendTest} disabled={isTestingSmtp} className="w-full md:w-auto">
                      {isTestingSmtp ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Invia Email di Prova
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold">Configurazione Resend Alternativa (Opzionale)</h4>
                    <p className="text-xs text-muted-foreground">
                      Se desideri inoltrare tramite un tuo account Resend dedicato invece del server di dominio mannatec.it, compila i campi sottostanti. Se lasciati vuoti, verrà usato sempre il server mannatec.it.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="resendApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resend API Key (Opzionale)</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="re_..." {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defaultSenderEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Mittente Resend (Opzionale)</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="noreply@tuodominio.it" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                        <Input placeholder="il-tuo-project-id" {...field} value={field.value ?? ''} />
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
                        <Input placeholder="nome-sa@il-tuo-project-id.iam.gserviceaccount.com" {...field} value={field.value ?? ''} />
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
                        <Textarea placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" {...field} value={field.value ?? ''} />
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
                        <Input placeholder="nome-del-tuo-bucket" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <Button type="button" variant="outline" onClick={handleBucketTest} disabled={isTestingGcs}>
                    {isTestingGcs ? <Loader className="mr-2 animate-spin" /> : <TestTubeDiagonal className="mr-2" />}
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
