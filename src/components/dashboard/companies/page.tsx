
'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Company, addCompany, getCompanies } from '@/lib/data';
import { Loader, PlusCircle, Building, Mail, Phone, Rocket, Bug, Wrench, ShieldCheck, ClipboardCheck, MailCheck, LayoutDashboard, Users as UsersIcon, Contact } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AddressAutocompleteInput } from '../ui/address-autocomplete-input';

const formSchema = z.object({
    name: z.string().min(1, { message: 'Il nome è obbligatorio' }),
    address: z.string().optional(),
    vatNumber: z.string().optional(),
    taxCode: z.string().optional(),
    phone: z.string().optional(),
    uniqueCode: z.string().optional(),
    email: z.string().email({ message: 'Email non valida' }),
    password: z.string().min(8, { message: 'La password deve contenere almeno 8 caratteri' })
});

const changelog = [
     { 
        version: "0.8",
        date: "2024-09-22",
        title: "Riorganizzazione Utenti e Dettagli Contatto",
        icon: UsersIcon,
        iconClass: "text-blue-500",
        changes: [
            { type: UsersIcon, description: "Separata la gestione dei Clienti da quella degli Utenti interni per maggiore chiarezza." },
            { type: Contact, description: "Aggiunti campi 'Telefono' e 'Indirizzo' ai dati dei clienti e utenti." },
            { type: Phone, description: "Resi cliccabili i numeri di telefono e gli indirizzi negli elenchi interventi, sopralluoghi e clienti." },
            { type: Bug, description: "Corretta la visualizzazione dei dati di contatto nelle viste mobile degli elenchi." },
            { type: Bug, description: "Risolto un errore di 'uncontrolled input' nei moduli di modifica utente." }
        ]
    },
     { 
        version: "0.7",
        date: "2024-09-21",
        title: "Miglioramenti UX e Affidabilità Notifiche",
        icon: Rocket,
        iconClass: "text-green-500",
        changes: [
            { type: LayoutDashboard, description: "Aggiunto pulsante 'Crea Intervento' direttamente nella dashboard per un accesso più rapido." },
            { type: MailCheck, description: "Risolto definitivamente il problema delle notifiche email per i nuovi interventi, adottando un sistema di invio diretto più robusto." },
            { type: Wrench, description: "Chiarito il contenuto dell'email di test per evitare confusione con le notifiche reali." },
            { type: ShieldCheck, description: "Resi obbligatori i campi 'Ore Impiegate' e 'Materiali Usati' alla chiusura di un intervento." },
            { type: Wrench, description: "Semplificato e reso più affidabile il sistema di suggerimento per i titoli degli interventi." },
            { type: Bug, description: "Corretto un errore critico che impediva il salvataggio degli interventi a causa di un valore non valido nel campo `completedAt`." }
        ]
    },
     { 
        version: "0.6",
        date: "2024-09-20",
        title: "Gestione Sopralluoghi",
        icon: ClipboardCheck,
        iconClass: "text-purple-500",
        changes: [
            { type: Wrench, description: "Aggiunta una nuova sezione 'Sopralluoghi' per la gestione delle ispezioni in loco." },
            { type: Wrench, description: "Implementata tabella con ricerca, filtri e ordinamento per i sopralluoghi." },
            { type: Wrench, description: "Create funzionalità complete di Aggiunta, Modifica e Cancellazione per i sopralluoghi." }
        ]
    },
    { 
        version: "0.5",
        date: "2024-09-19",
        title: "Notifiche Automatiche e Fix Accessibilità",
        icon: Rocket,
        iconClass: "text-green-500",
        changes: [
            { type: Wrench, description: "Implementato un sistema di notifica automatica via email per gli interventi in scadenza." },
            { type: Bug, description: "Risolto un bug di accessibilità nel menu mobile che non aveva un titolo per gli screen reader." },
            { type: Wrench, description: "Aggiunta la voce 'Le mie Richieste' alla sidebar per gli utenti Clienti." },
            { type: Bug, description: "Risolto il problema del logout automatico al ridimensionamento della finestra del browser." },
            { type: Wrench, description: "Permesso a tutti gli utenti di modificare il proprio profilo (password e avatar)." },
            { type: Bug, description: "Corretti molteplici errori `FAILED_PRECONDITION` legati alla chiave API di Gemini, cambiando l'approccio all'invio delle email di test." }
        ]
    },
    { 
        version: "0.4",
        date: "2024-09-18",
        title: "Configurazione Email e Miglioramenti UI",
        icon: Wrench,
        iconClass: "text-blue-500",
        changes: [
            { type: Wrench, description: "Centralizzata la gestione delle impostazioni SMTP nel database per ogni azienda, abbandonando il local storage." },
            { type: Wrench, description: "Migliorata la UI della pagina Impostazioni con un layout più pulito e un avviso di errore persistente per i test di connessione." }
        ]
    },
    // Add previous versions here if needed
];


export default function CompaniesPage() {
    const { user, switchCompany } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            address: '',
            vatNumber: '',
            taxCode: '',
            phone: '',
            uniqueCode: '',
            email: '',
            password: ''
        },
    });

    useEffect(() => {
        if(user && user.role !== 'Creator') {
            router.push('/dashboard');
        }

        async function fetchCompanies() {
            setIsLoading(true);
            const comps = await getCompanies();
            setCompanies(comps);
            setIsLoading(false);
        }

        if (user) {
            fetchCompanies();
        }
    }, [user, router]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const newCompany = await addCompany(values);
        setCompanies(prev => [...prev, newCompany]);
        toast({ title: 'Azienda creata', description: `L'azienda "${values.name}" è stata creata.` });
        form.reset();
        setIsDialogOpen(false);
    };
    
    const handleCompanyClick = (companyId: string) => {
        switchCompany(companyId);
        router.push('/dashboard');
    };

    if (isLoading || !user) {
        return (
            <>
                <Header title="Aziende" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

    if (user.role !== 'Creator') {
        return null;
    }

    return (
        <>
            <Header title="Gestione Aziende" />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="flex justify-end mb-4">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2" />
                                Crea Azienda
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] p-0">
                             <DialogHeader className="p-6 pb-0">
                                <DialogTitle>Crea una nuova azienda</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-full">
                                <div className="p-6">
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} id="add-company-form" className="space-y-4">
                                       <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Nome Azienda</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nome della nuova azienda" {...field} />
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
                                                    <AddressAutocompleteInput name={field.name} placeholder="Via, Città, CAP" />
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
                                                        <Input placeholder="IT..." {...field} />
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
                                                        <Input placeholder="Codice fiscale..." {...field} />
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
                                                        <Input placeholder="Numero di telefono" {...field} />
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
                                                    <FormLabel>Codice Univoco</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Codice SDI" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>Email (per login admin)</FormLabel>
                                                    <FormControl>
                                                        <Input type="email" placeholder="admin@azienda.com" {...field} />
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
                                                    <FormLabel>Password (per login admin)</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </form>
                                </Form>
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-6 pt-0">
                                <DialogClose asChild>
                                    <Button variant="outline">Annulla</Button>
                                </DialogClose>
                                <Button type="submit" form="add-company-form">Crea</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {companies.map(company => (
                        <Card key={company.id} className="flex flex-col cursor-pointer hover:bg-muted/50" onClick={() => handleCompanyClick(company.id)}>
                            <CardHeader className="flex-row items-start gap-4 space-y-0">
                                <div className="space-y-1">
                                    <CardTitle>{company.name}</CardTitle>
                                    <CardDescription>{company.address}</CardDescription>
                                </div>
                                <Building className="h-8 w-8 text-muted-foreground ml-auto" />
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-muted-foreground mt-auto">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4"/>
                                    <span>{company.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4"/>
                                    <span>{company.phone}</span>
                                </div>
                            </CardContent>
                             <CardFooter>
                                <p className="text-xs text-muted-foreground">P.IVA: {company.vatNumber}</p>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <Separator className="my-8" />
                
                <div className="space-y-8">
                     <div className="text-center">
                        <h2 className="text-3xl font-bold font-headline">Changelog MannaTic</h2>
                        <p className="text-muted-foreground">Tutte le modifiche e le novità implementate.</p>
                    </div>
                    {changelog.map((entry) => (
                    <Card key={entry.version}>
                        <CardHeader className="flex-row items-start gap-4 space-y-0">
                            <div className="flex items-center gap-4">
                                <entry.icon className={`h-8 w-8 ${entry.iconClass}`} />
                                <div className="space-y-1.5">
                                    <CardTitle className="flex items-center gap-3">
                                        {entry.title}
                                        <Badge variant="outline">v{entry.version}</Badge>
                                    </CardTitle>
                                    <CardDescription>Rilasciato il {entry.date}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3 pl-5 list-none">
                                {entry.changes.map((change, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <change.type className={`mt-1 h-4 w-4 shrink-0 ${change.type === Bug ? 'text-destructive' : 'text-muted-foreground'}`} />
                                        <span>{change.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                    ))}
                </div>
            </main>
        </>
    );
}

    

    

    
