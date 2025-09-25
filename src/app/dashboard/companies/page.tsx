
'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Company, addCompany, getCompanies, deleteCompanyAndSubcollections, updateCompany } from '@/lib/data';
import { Loader, PlusCircle, Building, Mail, Phone, Rocket, Bug, Wrench, ShieldCheck, ClipboardCheck, MailCheck, LayoutDashboard, Users as UsersIcon, Contact, MoreHorizontal, Pencil, Trash2, Shield, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CompanyForm } from '@/components/dashboard/company-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const changelog = [
     {
        version: "0.10",
        date: "2024-09-24",
        title: "Privacy, UX e Gestione Avanzata",
        icon: Shield,
        iconClass: "text-purple-500",
        changes: [
            { type: Eye, description: "La dashboard del cliente ora mostra solo ed esclusivamente i dati relativi ai propri interventi, garantendo la privacy." },
            { type: Building, description: "Implementata la gestione completa delle aziende, con possibilità di modifica e cancellazione sicura." },
            { type: Wrench, description: "Gli ID di interventi, sopralluoghi e manutenzioni sono ora più corti (8 caratteri) e facili da leggere." },
            { type: MailCheck, description: "Le notifiche vengono ora contrassegnate automaticamente come lette all'apertura del menu, migliorando l'usabilità." },
            { type: Bug, description: "Risolto un errore critico nella creazione di un ticket dal pannello cliente che causava l'associazione di un nome errato." },
            { type: Bug, description: "Corretti vari bug minori e migliorata la stabilità generale." },
        ]
    },
     {
        version: "0.9",
        date: "2024-09-23",
        title: "Miglioramenti UI e Correzioni Funzionali",
        icon: Wrench,
        iconClass: "text-green-500",
        changes: [
            { type: Wrench, description: "Migliorata la reattività di tutti gli elenchi per una visualizzazione ottimale su dispositivi mobili e tablet." },
            { type: Wrench, description: "Impostato il filtro predefinito 'In scadenza (30gg)' per la tabella delle manutenzioni." },
            { type: Wrench, description: "Aggiunta la possibilità per gli Admin di caricare un logo aziendale, visibile nell'intestazione e nella sidebar." },
            { type: LayoutDashboard, description: "Creata una pagina 'Info' per il ruolo Creator con riepilogo funzionale e link diretti al monitoraggio delle risorse Firebase." },
            { type: Wrench, description: "Semplificata la creazione delle manutenzioni rimuovendo il campo 'Attrezzatura'." },
            { type: Bug, description: "Corretto un bug che impediva il corretto ordinamento delle manutenzioni scadute." },
            { type: Bug, description: "Risolto un errore che si verificava durante la creazione di un sopralluogo senza specificare un orario." },
            { type: Bug, description: "La data di esecuzione di una manutenzione programmata viene ora aggiornata correttamente alla data odierna quando viene impostata su 'Completato'." },
        ]
    },
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
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
    

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

    const handleCreateClick = () => {
        setSelectedCompany(null);
        setIsFormOpen(true);
    };

    const handleEditClick = (company: Company) => {
        setSelectedCompany(company);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (company: Company) => {
        setCompanyToDelete(company);
        setIsDeleteDialogOpen(true);
    };

    const handleFormSubmit = async (values: Partial<Company>) => {
        try {
            if (selectedCompany) {
                // Update
                const updated = await updateCompany(selectedCompany.id, values);
                if (updated) {
                    setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
                    toast({ title: 'Azienda aggiornata', description: `L'azienda "${values.name}" è stata aggiornata.` });
                }
            } else {
                // Create
                const newCompany = await addCompany(values as Omit<Company, 'id'>);
                setCompanies(prev => [...prev, newCompany]);
                toast({ title: 'Azienda creata', description: `L'azienda "${values.name}" è stata creata.` });
            }
            setIsFormOpen(false);
            setSelectedCompany(null);
            return true;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Errore', description: "Si è verificato un errore." });
            return false;
        }
    };
    
    const confirmDelete = async () => {
        if (!companyToDelete) return;
        try {
            await deleteCompanyAndSubcollections(companyToDelete.id);
            setCompanies(prev => prev.filter(c => c.id !== companyToDelete.id));
            toast({ title: 'Azienda eliminata', description: `L'azienda "${companyToDelete.name}" e tutti i suoi dati sono stati eliminati.` });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile eliminare l\'azienda.' });
        }
        setIsDeleteDialogOpen(false);
        setCompanyToDelete(null);
    };
    
    const handleCompanyClick = (company: Company) => {
        switchCompany(company.id);
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
                     <Button onClick={handleCreateClick}>
                        <PlusCircle className="mr-2" />
                        Crea Azienda
                    </Button>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {companies.map(company => (
                        <Card key={company.id} className="flex flex-col">
                            <CardHeader className="flex-row items-start gap-4 space-y-0 pb-2">
                                <div className="space-y-1 flex-1 cursor-pointer" onClick={() => handleCompanyClick(company)}>
                                    <CardTitle>{company.name}</CardTitle>
                                    <CardDescription>{company.address}</CardDescription>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                                            <MoreHorizontal />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => handleEditClick(company)}>
                                            <Pencil className="mr-2" /> Modifica
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                handleDeleteClick(company);
                                            }}>
                                            <Trash2 className="mr-2" /> Elimina
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-muted-foreground mt-auto cursor-pointer" onClick={() => handleCompanyClick(company)}>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4"/>
                                    <span>{company.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4"/>
                                    <span>{company.phone}</span>
                                </div>
                            </CardContent>
                             <CardFooter className="cursor-pointer" onClick={() => handleCompanyClick(company)}>
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
            <CompanyForm
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                onSubmit={handleFormSubmit}
                company={selectedCompany}
            />
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Questa azione non può essere annullata. L'azienda <b>{companyToDelete?.name}</b> e tutti i dati associati (utenti, clienti, interventi, etc.) verranno eliminati definitivamente.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Elimina</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    