
'use client';

import { useForm, useForm as useSmtpForm, FormProvider } from 'react-hook-form';
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
import { Separator } from '@/components/ui/separator';
import { sendTestEmail, saveSmtpSettings } from '@/app/actions';
import { Loader, AlertTriangle, Pencil } from 'lucide-react';
import { Company } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries: ('places' | 'drawing' | 'geometry' | 'localContext' | 'visualization')[] = ['places'];

const smtpFormSchema = z.object({
  smtpHost: z.string().min(1, { message: 'Host SMTP obbligatorio.' }),
  smtpPort: z.coerce.number().min(1, { message: 'Porta SMTP obbligatoria.' }),
  smtpUser: z.string().min(1, { message: 'Username obbligatorio.' }),
  smtpPass: z.string().min(1, { message: 'Password obbligatoria.' }),
  senderEmail: z.string().email({ message: 'Email mittente non valida.' }),
  recipientEmail: z.string().email({ message: 'Email destinatario non valida.' }),
});

const profileFormSchema = z.object({
  name: z.string().min(1, { message: 'Il nome è obbligatorio' }),
  address: z.string().optional(),
  logoUrl: z.string().optional(),
});


function CompanyProfileForm({ company, onSave }: { company: Company, onSave: (data: Partial<Company>) => void }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { isLoaded, loadError } = useLoadScript({
      googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      libraries,
  });

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: company.name,
      address: company.address || '',
      logoUrl: company.logoUrl || '',
    }
  });

  const logoUrl = form.watch('logoUrl');

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    onSave(values);
  };
  
  const handleLogoClick = () => {
    fileInputRef.current?.click();
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      const formattedAddress = place.formatted_address || (inputRef.current ? inputRef.current.value : '');
      form.setValue('address', formattedAddress, { shouldValidate: true, shouldDirty: true });
    }
  };


  return (
     <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profilo Azienda</CardTitle>
            <CardDescription>
              Modifica le informazioni principali e il logo della tua azienda.
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
                  <FormLabel>Nome Azienda</FormLabel>
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
                    {isLoaded && !loadError ? (
                      <Autocomplete
                        onLoad={onAutocompleteLoad}
                        onPlaceChanged={onPlaceChanged}
                        fields={['formatted_address']}
                      >
                        <Input {...field} ref={inputRef} />
                      </Autocomplete>
                    ) : (
                      <Input {...field} disabled={!isLoaded}/>
                    )}
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


function SmtpSettingsForm({ company, onSave, onTest }: { company: Company, onSave: (data: Partial<Company>) => void, onTest: (data: any) => void }) {
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const form = useSmtpForm<z.infer<typeof smtpFormSchema>>({
    resolver: zodResolver(smtpFormSchema),
    defaultValues: {
      smtpHost: company.smtpHost || '',
      smtpPort: company.smtpPort || 587,
      smtpUser: company.smtpUser || '',
      smtpPass: company.smtpPass || '',
      senderEmail: company.senderEmail || '',
      recipientEmail: '',
    },
  });

  async function onSubmit(values: z.infer<typeof smtpFormSchema>) {
    setTestError(null);
    const settingsToSave: Partial<Company> = {
      smtpHost: values.smtpHost,
      smtpPort: values.smtpPort,
      smtpUser: values.smtpUser,
      smtpPass: values.smtpPass,
      senderEmail: values.senderEmail,
    };
    onSave(settingsToSave);
  }
  
  async function onTestConnection() {
    const isValid = await form.trigger();
    if (!isValid) return;

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

    if (!result.success) {
      setTestError(result.error || 'Controlla le impostazioni SMTP e la connessione di rete.');
    }
    onTest(result);
    setIsTesting(false);
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurazione Notifiche Email (SMTP)</CardTitle>
            <CardDescription>
              Inserisci i dettagli del tuo provider SMTP. Le credenziali vengono salvate in modo sicuro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* SMTP Fields */}
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
            <Button type="button" variant="outline" onClick={onTestConnection} disabled={isTesting}>
              {isTesting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Testa Notifica
            </Button>
            <Button type="submit" disabled={isTesting}>
              Salva Impostazioni SMTP
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


export default function SettingsPage() {
  const { user, currentCompany, setCurrentCompany } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, router]);
  
  if (!user || user.role !== 'Admin' || !currentCompany) {
    return null;
  }

  const handleSave = async (data: Partial<Company>) => {
    if (!currentCompany) return;
    setIsSaving(true);
    
    const updatedCompany = await saveSmtpSettings(currentCompany.id, data);

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
          <TabsList>
            <TabsTrigger value="profile">Profilo Azienda</TabsTrigger>
            <TabsTrigger value="smtp">Notifiche (SMTP)</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <CompanyProfileForm company={currentCompany} onSave={handleSave} />
          </TabsContent>
          <TabsContent value="smtp">
             <SmtpSettingsForm company={currentCompany} onSave={handleSave} onTest={handleTestResult} />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
