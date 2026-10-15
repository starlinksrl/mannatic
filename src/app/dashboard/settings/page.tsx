

'use client';

import { useForm, FormProvider } from 'react-hook-form';
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
import React, { useEffect, useState, useRef } from 'react';
import { sendTestEmailAction, updateCompanySettings, testDailySummaryAction, testWeeklySummaryAction, testOverdueAlertsAction } from '@/app/actions';
import { Loader, AlertTriangle, Pencil, Save, Send, Mail, Check, Bell, Calendar, Clock, Users, ShieldAlert, CheckCircle2, ListFilter } from 'lucide-react';
import { Company, User, getCompanyNotificationSettings } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Autocomplete } from '@react-google-maps/api';
import { useMaps } from '@/contexts/maps-context';
import { ThemeSwitcher } from '@/components/dashboard/theme-switcher';
import { ChangelogDisplay } from '@/components/dashboard/changelog-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import ManualPageContent from '@/components/dashboard/manual-page-content';
import { FontSwitcher } from '@/components/dashboard/font-switcher';
import { ViewModeSwitcher } from '@/components/dashboard/view-mode-switcher';
import { getUsers } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';


const resendFormSchema = z.object({
  resendApiKey: z.string().optional(),
  senderEmail: z.string().email({ message: 'Email mittente non valida.' }).optional().or(z.literal('')),
  recipientEmail: z.string().email({ message: 'Email destinatario non valida.' }).optional().or(z.literal('')),
});

const profileFormSchema = z.object({
  name: z.string().min(1, { message: 'Il nome è obbligatorio' }),
  address: z.string().optional(),
  logoUrl: z.string().optional(),
  vatNumber: z.string().optional(),
  taxCode: z.string().optional(),
  phone: z.string().optional(),
  uniqueCode: z.string().optional(),
  email: z.string().email({ message: 'Email non valida' }).optional(),
  platformUrl: z.string().url({ message: "L'URL non è valido" }).optional().or(z.literal('')),
});

const notificationsFormSchema = z.object({
  dailySummaryEnabled: z.boolean().default(true),
  dailySummaryToAdmins: z.boolean().default(true),
  dailySummaryToOperators: z.boolean().default(true),
  weeklySummaryEnabled: z.boolean().default(true),
  weeklySummaryToAdmins: z.boolean().default(true),
  weeklySummaryIncludeOperators: z.boolean().default(false),
  overdueTicketsAlertEnabled: z.boolean().default(true),
  overdueInterventionsAlertEnabled: z.boolean().default(true),
  notifyAssignedOperatorsOnOverdue: z.boolean().default(true),
  recipients: z.array(z.string()).default([]),
});


function CompanyProfileForm({ company, onSave }: { company: Company, onSave: (data: Partial<Company>) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { isLoaded } = useMaps();

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: company.name,
      address: company.address || '',
      logoUrl: company.logoUrl || '',
      vatNumber: company.vatNumber || '',
      taxCode: company.taxCode || '',
      phone: company.phone || '',
      uniqueCode: company.uniqueCode || '',
      email: company.email || '',
      platformUrl: company.platformUrl || '',
    }
  });

  const logoUrl = form.watch('logoUrl');

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    onSave(values);
  };
  
  const handleLogoClick = () => {
    fileInputRef.current?.click();
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const { compressLogo } = await import('@/lib/image-compression');
        const compressed = await compressLogo(file);
        form.setValue('logoUrl', compressed, { shouldDirty: true });
      } catch (err) {
        console.warn('Logo compression fallback:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          form.setValue('logoUrl', reader.result as string, { shouldDirty: true });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
        const place = autocompleteRef.current.getPlace();
        if (place && place.formatted_address) {
            form.setValue('address', place.formatted_address, { shouldValidate: true, shouldDirty: true });
        }
    }
  };

  return (
     <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profilo Installatore</CardTitle>
            <CardDescription>
              Modifica le informazioni principali e il logo delil tuo installatore.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex justify-center">
                <div className="relative">
                    <Avatar className="h-24 w-24 mb-4 cursor-pointer" onClick={handleLogoClick}>
                        <AvatarImage src={logoUrl} alt={company.name} />
                        <AvatarFallback>{company.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Button type="button" variant="outline" size="icon" className="absolute bottom-4 right-0 rounded-full h-8 w-8" onClick={handleLogoClick}>
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
                  <FormLabel>Nome Installatore</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="vatNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Partita IVA</FormLabel>
                    <FormControl>
                        <Input {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="taxCode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Codice Fiscale</FormLabel>
                    <FormControl>
                        <Input {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                        <Input {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="uniqueCode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Codice Univoco (SDI)</FormLabel>
                    <FormControl>
                        <Input {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email Contatto</FormLabel>
                    <FormControl>
                        <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
             <FormField
                control={form.control}
                name="platformUrl"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Link Piattaforma</FormLabel>
                    <FormControl>
                        <Input type="url" placeholder="https://work.installatore.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit">Salva Profilo</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}


function ResendSettingsForm({ company, onSave, onTest }: { company: Company, onSave: (data: Partial<Company>) => void, onTest: (data: any) => void }) {
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const originalApiKey = useRef(company.resendApiKey);

  const form = useForm<z.infer<typeof resendFormSchema>>({
    resolver: zodResolver(resendFormSchema),
    defaultValues: {
      resendApiKey: company.resendApiKey ? '••••••••' : '',
      senderEmail: company.senderEmail || '',
      recipientEmail: '',
    },
  });

  async function onSubmit(values: z.infer<typeof resendFormSchema>) {
    setTestError(null);
    const settingsToSave: Partial<Company> = {
      senderEmail: values.senderEmail || undefined,
    };
    if (values.resendApiKey && values.resendApiKey !== '••••••••') {
      settingsToSave.resendApiKey = values.resendApiKey;
      originalApiKey.current = values.resendApiKey;
    } else if (values.resendApiKey === '••••••••') {
      settingsToSave.resendApiKey = originalApiKey.current;
    } else {
      settingsToSave.resendApiKey = '';
      originalApiKey.current = '';
    }
    onSave(settingsToSave);
  }
  
  async function onTestConnection() {
    const values = form.getValues();
    if (!values.recipientEmail) {
      setTestError("Inserisci un indirizzo email nel campo 'Email Destinatario per Test'.");
      return;
    }

    setIsTesting(true);
    setTestError(null);
    const apiKey = values.resendApiKey === '••••••••' ? originalApiKey.current : values.resendApiKey;
    
    const result = await sendTestEmailAction({
        recipientEmail: values.recipientEmail,
        resendConfig: (apiKey && values.senderEmail) ? {
            apiKey: apiKey,
            from: values.senderEmail,
        } : undefined
    });

    if (!result.success) {
      setTestError(result.error || 'Invio fallito. Verifica la configurazione.');
    }
    onTest(result);
    setIsTesting(false);
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Invio Email di Sistema (Dominio mannatec.it)
                </CardTitle>
                <CardDescription>
                  Il sistema gestisce l'invio delle notifiche e dei riepiloghi direttamente dal server di posta del dominio.
                </CardDescription>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                <Check className="h-3.5 w-3.5" />
                Dominio Attivo
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-muted/40 border text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Server SMTP</span>
                <strong className="font-mono">mail.mannatec.it</strong>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Porta &amp; Protocollo</span>
                <strong className="font-mono">465 (SSL / TLS)</strong>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Account Ufficiale</span>
                <strong className="font-mono text-primary">noreply@mannatec.it</strong>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-medium text-sm flex items-center gap-1.5 text-foreground">
                <Send className="h-4 w-4 text-primary" />
                Testa Recapito Email
              </div>
              <FormField
                control={form.control}
                name="recipientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Destinatario per Test</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="latuaemail@esempio.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold">Personalizzazione Resend (Opzionale)</h4>
                <p className="text-xs text-muted-foreground">
                  Se preferisci inviare le email dal tuo dominio personale tramite un tuo account Resend, inserisci qui l'API Key e il mittente verificato. Se lasci vuoto, verrà utilizzato in automatico il server mannatec.it.
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
                        <Input type="password" placeholder="re_... (lascia vuoto per dominio)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="senderEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Mittente Personalizzata (Opzionale)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="es. info@tuodominio.it" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onTestConnection} disabled={isTesting}>
              {isTesting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Invia Email di Test
            </Button>
            <Button type="submit" disabled={isTesting}>
              Salva Impostazioni
            </Button>
          </CardFooter>
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
      </form>
    </Form>
  )
}

const whatsappFormSchema = z.object({
  whatsappAccessToken: z.string().optional(),
  whatsappPhoneNumberId: z.string().optional(),
  whatsappTemplateName: z.string().optional(),
  whatsappAdminPhone: z.string().optional().refine(val => !val || /^\+?[1-9]\d{1,14}$/.test(val), { message: "Numero di telefono non valido. Usa il formato internazionale (es. +393331234567)" }),
});

function WhatsAppSettingsForm({ company, onSave }: { company: Company, onSave: (data: Partial<Company>) => void }) {
  const originalAccessToken = useRef(company.whatsappAccessToken || '');

  const form = useForm<z.infer<typeof whatsappFormSchema>>({
    resolver: zodResolver(whatsappFormSchema),
    defaultValues: {
      whatsappAccessToken: company.whatsappAccessToken ? '••••••••' : '',
      whatsappPhoneNumberId: company.whatsappPhoneNumberId || '',
      whatsappTemplateName: company.whatsappTemplateName || '',
      whatsappAdminPhone: company.whatsappAdminPhone || '',
    },
  });

  async function onSubmit(values: z.infer<typeof whatsappFormSchema>) {
    const settingsToSave: Partial<Company> = {
      whatsappPhoneNumberId: values.whatsappPhoneNumberId || '',
      whatsappTemplateName: values.whatsappTemplateName || '',
      whatsappAdminPhone: values.whatsappAdminPhone || '',
    };
    
    if (values.whatsappAccessToken !== '••••••••') {
      settingsToSave.whatsappAccessToken = values.whatsappAccessToken || '';
      originalAccessToken.current = values.whatsappAccessToken || '';
    } else {
      settingsToSave.whatsappAccessToken = originalAccessToken.current;
    }
    
    onSave(settingsToSave);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurazione WhatsApp Business API</CardTitle>
            <CardDescription>
              Inserisci le credenziali di Meta Cloud API per inviare notifiche WhatsApp dal tuo account aziendale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="whatsappAccessToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Permanent Access Token</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="EAAB..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="whatsappPhoneNumberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Phone Number ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Es. 1029384756..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsappTemplateName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Template (Meta)</FormLabel>
                    <FormControl>
                      <Input placeholder="Es. nuovo_ticket" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="whatsappAdminPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero WhatsApp Amministratore (Ricezione Notifiche)</FormLabel>
                  <FormControl>
                    <Input placeholder="Es. +393331234567" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Il numero su cui gli amministratori dell'installatore riceveranno gli avvisi all'apertura di un ticket da parte dei clienti.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit">
              Salva Impostazioni WhatsApp
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

function NotificationsForm({ company, operators, onSave }: { company: Company; operators: User[]; onSave: (data: Partial<Company>) => void }) {
  const { toast } = useToast();
  const [isTestingDaily, setIsTestingDaily] = useState(false);
  const [isTestingWeekly, setIsTestingWeekly] = useState(false);
  const [isTestingOverdue, setIsTestingOverdue] = useState(false);

  const currentSettings = getCompanyNotificationSettings(company);

  const form = useForm<z.infer<typeof notificationsFormSchema>>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      dailySummaryEnabled: currentSettings.dailySummaryEnabled,
      dailySummaryToAdmins: currentSettings.dailySummaryToAdmins,
      dailySummaryToOperators: currentSettings.dailySummaryToOperators,
      weeklySummaryEnabled: currentSettings.weeklySummaryEnabled,
      weeklySummaryToAdmins: currentSettings.weeklySummaryToAdmins,
      weeklySummaryIncludeOperators: currentSettings.weeklySummaryIncludeOperators,
      overdueTicketsAlertEnabled: currentSettings.overdueTicketsAlertEnabled,
      overdueInterventionsAlertEnabled: currentSettings.overdueInterventionsAlertEnabled,
      notifyAssignedOperatorsOnOverdue: currentSettings.notifyAssignedOperatorsOnOverdue,
      recipients: currentSettings.recipients || [],
    },
  });

  const dailyEnabled = form.watch('dailySummaryEnabled');
  const weeklyEnabled = form.watch('weeklySummaryEnabled');
  const selectedRecipients = form.watch('recipients') || [];

  const handleSelectAllOperators = () => {
    form.setValue('recipients', operators.map(o => o.id), { shouldDirty: true });
  };

  const handleDeselectAllOperators = () => {
    form.setValue('recipients', [], { shouldDirty: true });
  };

  function onSubmit(data: z.infer<typeof notificationsFormSchema>) {
    onSave({
      cronJobRecipients: {
        recipients: data.recipients,
        dailySummaryEnabled: data.dailySummaryEnabled,
        dailySummaryToAdmins: data.dailySummaryToAdmins,
        dailySummaryToOperators: data.dailySummaryToOperators,
        weeklySummaryEnabled: data.weeklySummaryEnabled,
        weeklySummaryToAdmins: data.weeklySummaryToAdmins,
        weeklySummaryIncludeOperators: data.weeklySummaryIncludeOperators,
        overdueTicketsAlertEnabled: data.overdueTicketsAlertEnabled,
        overdueInterventionsAlertEnabled: data.overdueInterventionsAlertEnabled,
        notifyAssignedOperatorsOnOverdue: data.notifyAssignedOperatorsOnOverdue,
      }
    });
  }

  const handleTestDaily = async () => {
    setIsTestingDaily(true);
    const result = await testDailySummaryAction(company.id);
    if (result.success) {
      toast({ title: 'Test Riepilogo Giornaliero Inviato', description: 'Controlla la casella di posta dei destinatari configurati.' });
    } else {
      toast({ variant: 'destructive', title: 'Errore nel Test', description: result.error || 'Si è verificato un errore sconosciuto.' });
    }
    setIsTestingDaily(false);
  };

  const handleTestWeekly = async () => {
    setIsTestingWeekly(true);
    const result = await testWeeklySummaryAction(company.id);
    if (result.success) {
      toast({ title: 'Test Riepilogo Settimanale Inviato', description: 'Controlla la casella di posta dei destinatari configurati.' });
    } else {
      toast({ variant: 'destructive', title: 'Errore nel Test', description: result.error || 'Si è verificato un errore sconosciuto.' });
    }
    setIsTestingWeekly(false);
  };

  const handleTestOverdue = async () => {
    setIsTestingOverdue(true);
    const result = await testOverdueAlertsAction(company.id);
    if (result.success) {
      toast({ 
        title: 'Verifica Solleciti Completata', 
        description: `Alert inviati: ${result.ticketsAlerted ?? 0} ticket oltre 48h, ${result.interventionsAlerted ?? 0} interventi oltre 7 giorni.` 
      });
    } else {
      toast({ variant: 'destructive', title: 'Errore nel Test', description: result.error || 'Si è verificato un errore sconosciuto.' });
    }
    setIsTestingOverdue(false);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header descrittivo */}
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent p-4 sm:p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Gestione Notifiche, Riepiloghi & Automazioni</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Personalizza quali notifiche inviare, a chi inoltrarle (amministratori e/o operatori) e i solleciti automatici per ticket ed interventi aperti.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 1: Riepilogo Giornaliero */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base sm:text-lg">Riepilogo Giornaliero (Interventi in Scadenza)</CardTitle>
                </div>
                <FormField
                  control={form.control}
                  name="dailySummaryEnabled"
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Badge variant={field.value ? "default" : "secondary"} className="text-xs">
                        {field.value ? "Attivo" : "Disattivato"}
                      </Badge>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  )}
                />
              </div>
              <CardDescription>
                Invia ogni mattina un'email con la lista degli interventi con scadenza prevista entro le successive 48 ore.
              </CardDescription>
            </CardHeader>
            {dailyEnabled && (
              <CardContent className="pt-2 border-t border-border/40 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destinatari del Riepilogo Giornaliero:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="dailySummaryToAdmins"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 bg-muted/20">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="leading-none">
                          <FormLabel className="font-medium cursor-pointer">Invia agli Amministratori</FormLabel>
                          <p className="text-xs text-muted-foreground mt-1">Tutti gli admin dell'azienda</p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dailySummaryToOperators"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 bg-muted/20">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="leading-none">
                          <FormLabel className="font-medium cursor-pointer">Invia agli Operatori</FormLabel>
                          <p className="text-xs text-muted-foreground mt-1">Operatori selezionati nella lista sottostante</p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* CARD 2: Riepilogo Settimanale */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-base sm:text-lg">Riepilogo Settimanale (Interventi Aperti &gt; 7 Giorni)</CardTitle>
                </div>
                <FormField
                  control={form.control}
                  name="weeklySummaryEnabled"
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Badge variant={field.value ? "default" : "secondary"} className="text-xs">
                        {field.value ? "Attivo" : "Disattivato"}
                      </Badge>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  )}
                />
              </div>
              <CardDescription>
                Invia all'inizio della settimana una panoramica completa di tutti gli interventi ancora aperti da oltre una settimana.
              </CardDescription>
            </CardHeader>
            {weeklyEnabled && (
              <CardContent className="pt-2 border-t border-border/40 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destinatari del Riepilogo Settimanale:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="weeklySummaryToAdmins"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 bg-muted/20">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="leading-none">
                          <FormLabel className="font-medium cursor-pointer">Invia agli Amministratori</FormLabel>
                          <p className="text-xs text-muted-foreground mt-1">Tutti gli admin dell'azienda</p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weeklySummaryIncludeOperators"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 bg-muted/20">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="leading-none">
                          <FormLabel className="font-medium cursor-pointer">Includi gli Operatori Selezionati</FormLabel>
                          <p className="text-xs text-muted-foreground mt-1">Invia il riepilogo anche agli operatori selezionati</p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* CARD 3: Solleciti Automatici per Inattività e Ritardi */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base sm:text-lg">Solleciti Automatici Inattività & Ritardi (Cron Giornaliero)</CardTitle>
              </div>
              <CardDescription>
                Controlla automaticamente ticket e interventi fermi e invia avvisi in-app (campanella) ed email ai responsabili.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 border-t border-border/40 space-y-4">
              <FormField
                control={form.control}
                name="overdueTicketsAlertEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3.5 bg-muted/20">
                    <div className="space-y-0.5 pr-4">
                      <FormLabel className="font-medium cursor-pointer">
                        Sollecito Ticket di supporto non chiusi entro 48 ore
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Notifica in-app ed email agli Amministratori per tutti i ticket clienti aperti da oltre 48h.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="overdueInterventionsAlertEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3.5 bg-muted/20">
                    <div className="space-y-0.5 pr-4">
                      <FormLabel className="font-medium cursor-pointer">
                        Sollecito Interventi aperti da oltre 7 giorni
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Notifica in-app ed email agli Amministratori per tutti gli interventi non completati dopo 1 settimana.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifyAssignedOperatorsOnOverdue"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-amber-500/30 p-3.5 bg-amber-500/5">
                    <div className="space-y-0.5 pr-4">
                      <div className="flex items-center gap-2">
                        <FormLabel className="font-medium cursor-pointer text-amber-900 dark:text-amber-200">
                          Invia Sollecito Intervento (&gt;7gg) anche ai Tecnici Assegnati
                        </FormLabel>
                        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px]">
                          Tecnici Diretti
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Se attivo, l'alert per interventi aperti da oltre 7 giorni verrà inviato (in-app ed email) anche a ciascun operatore assegnato all'intervento.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* CARD 4: Selezione Operatori Destinatari */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  <div>
                    <CardTitle className="text-base sm:text-lg">Operatori Destinatari dei Riepiloghi</CardTitle>
                    <CardDescription className="mt-0.5">
                      Seleziona specificamente quali tecnici/operatori devono ricevere i riepiloghi email. Se non ne selezioni nessuno, verranno considerati tutti gli operatori.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectAllOperators} className="text-xs h-8">
                    Seleziona Tutti
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleDeselectAllOperators} className="text-xs h-8">
                    Deseleziona
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between pb-3 text-xs text-muted-foreground border-b border-border/30">
                <span>Operatori disponibili: <b>{operators.length}</b></span>
                <Badge variant={selectedRecipients.length > 0 ? "secondary" : "outline"} className="text-xs">
                  {selectedRecipients.length === 0 ? "Tutti gli operatori (predefinito)" : `${selectedRecipients.length} selezionati`}
                </Badge>
              </div>

              {operators.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Nessun operatore configurato per questa azienda.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {operators.map((operator) => {
                    const isChecked = selectedRecipients.includes(operator.id);
                    return (
                      <div
                        key={operator.id}
                        onClick={() => {
                          if (isChecked) {
                            form.setValue('recipients', selectedRecipients.filter(id => id !== operator.id), { shouldDirty: true });
                          } else {
                            form.setValue('recipients', [...selectedRecipients, operator.id], { shouldDirty: true });
                          }
                        }}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          isChecked 
                            ? 'border-primary/60 bg-primary/5 shadow-xs' 
                            : 'border-border/60 hover:bg-muted/30'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              form.setValue('recipients', [...selectedRecipients, operator.id], { shouldDirty: true });
                            } else {
                              form.setValue('recipients', selectedRecipients.filter(id => id !== operator.id), { shouldDirty: true });
                            }
                          }}
                        />
                        <Avatar className="h-8 w-8 text-xs shrink-0">
                          {operator.avatarUrl ? (
                            <AvatarImage src={operator.avatarUrl} alt={operator.name} />
                          ) : (
                            <AvatarFallback>{operator.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1 leading-tight">
                          <p className="text-xs sm:text-sm font-medium truncate">{operator.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{operator.email}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end pt-4 border-t border-border/40">
              <Button type="submit" size="default" className="w-full sm:w-auto shadow-sm">
                <Save className="mr-2 h-4 w-4" /> Salva Impostazioni Notifiche
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {/* CARD 5: Test Manuale */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Collaudo & Invio Manuale Notifiche
          </CardTitle>
          <CardDescription>
            Esegui manualmente i controlli per verificare la ricezione delle email di riepilogo e degli avvisi di sollecito con le impostazioni attuali.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleTestDaily} disabled={isTestingDaily || isTestingWeekly || isTestingOverdue} variant="outline" className="w-full sm:w-auto">
            {isTestingDaily ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4 text-blue-600" />}
            Testa Riepilogo Giornaliero
          </Button>
          <Button onClick={handleTestWeekly} disabled={isTestingDaily || isTestingWeekly || isTestingOverdue} variant="outline" className="w-full sm:w-auto">
            {isTestingWeekly ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4 text-indigo-600" />}
            Testa Riepilogo Settimanale
          </Button>
          <Button onClick={handleTestOverdue} disabled={isTestingDaily || isTestingWeekly || isTestingOverdue} variant="secondary" className="w-full sm:w-auto">
            {isTestingOverdue ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />}
            Testa Solleciti 48h / 7 Giorni
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


export default function SettingsPage() {
  const { user, currentCompany, setCurrentCompany } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [operators, setOperators] = useState<User[]>([]);

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      router.push('/dashboard');
      return;
    }
    if (user && currentCompany) {
      getUsers(currentCompany.id).then(allUsers => {
        setOperators(allUsers.filter(u => u.role === 'Operator'));
      });
    }
  }, [user, router, currentCompany]);
  
  if (!user || user.role !== 'Admin' || !currentCompany) {
    return null;
  }

  const handleSave = async (data: Partial<Company>) => {
    if (!currentCompany) return;
    setIsSaving(true);
    
    const updatedCompany = await updateCompanySettings(currentCompany.id, data);

    if (updatedCompany) {
        setCurrentCompany(updatedCompany);
        toast({
          title: 'Impostazioni salvate',
          description: 'Le impostazioni sono state salvate nel database.',
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Errore',
            description: 'Impossibile salvare le impostazioni.',
        });
    }
    setIsSaving(false);
  }

  const handleTestResult = (result: { success: boolean; error?: string | null }) => {
     if (result.success) {
      toast({
        title: 'Test connessione riuscito!',
        description: `Email di prova inviata con successo.`,
      });
    }
  }

  return (
    <>
      <Header title="Impostazioni" />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="profile">Profilo</TabsTrigger>
            <TabsTrigger value="resend">Email</TabsTrigger>
            <TabsTrigger value="notifications">Notifiche</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="appearance">Aspetto</TabsTrigger>
            <TabsTrigger value="changelog">Changelog</TabsTrigger>
            <TabsTrigger value="manual">Manuale</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <CompanyProfileForm company={currentCompany} onSave={handleSave} />
          </TabsContent>
          <TabsContent value="resend">
             <ResendSettingsForm company={currentCompany} onSave={handleSave} onTest={handleTestResult} />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsForm company={currentCompany} operators={operators} onSave={handleSave} />
          </TabsContent>
          <TabsContent value="whatsapp">
            <WhatsAppSettingsForm company={currentCompany} onSave={handleSave} />
          </TabsContent>
           <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Aspetto Applicazione</CardTitle>
                <CardDescription>Personalizza la palette di colori, i font e la visualizzazione predefinita per l'interfaccia delil tuo installatore.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                 <div>
                    <h4 className="font-medium mb-4">Temi Colore</h4>
                    <ThemeSwitcher />
                 </div>
                 <div>
                    <h4 className="font-medium mb-4">Caratteri</h4>
                    <FontSwitcher />
                 </div>
                 <div>
                    <h4 className="font-medium mb-4">Visualizzazione Predefinita</h4>
                    <ViewModeSwitcher />
                 </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="changelog">
             <ScrollArea className="h-[calc(100vh-250px)]">
                <ChangelogDisplay />
             </ScrollArea>
          </TabsContent>
          <TabsContent value="manual">
             <ScrollArea className="h-[calc(100vh-250px)]">
                <ManualPageContent />
             </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
