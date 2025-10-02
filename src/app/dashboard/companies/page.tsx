

'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Company, addCompany, getCompanies, deleteCompanyAndSubcollections, updateCompany } from '@/lib/data';
import { Loader, PlusCircle, Building, Mail, Phone, Rocket, Bug, Wrench, ShieldCheck, ClipboardCheck, MailCheck, LayoutDashboard, Users as UsersIcon, Contact, MoreHorizontal, Pencil, Trash2, Shield, Eye, Database, Camera, Link as LinkIcon, AlertCircle, Paperclip, Monitor, Tablet, Smartphone } from 'lucide-react';
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
import Link from 'next/link';

const changelog = [
    {
        version: "0.14",
        date: "2024-09-30",
        title: "Ottimizzazione Mobile e Qualità della Vita",
        icon: Smartphone,
        iconClass: "text-green-500",
        changes: [
            { type: Smartphone, description: "Migliorata drasticamente la reattività della scheda 'Modifica Intervento' per una visualizzazione ottimale su schermi verticali stretti (smartphone)." },
            { type: Tablet, description: "Ottimizzata la visualizzazione della Dashboard e dell'elenco interventi su dispositivi mobili e tablet, con stacking automatico degli elementi." },
            { type: Phone, description: "Resi cliccabili i contatti (telefono, indirizzo) nella vista mobile dell'elenco interventi per un accesso rapido." },
            { type: Monitor, description: "Implementata la visibilità intelligente delle colonne nelle tabelle per schermi di medie dimensioni, nascondendo le informazioni meno critiche per evitare lo scorrimento orizzontale." },
        ]
    },
    {
        version: "0.13",
        date: "2024-09-27",
        title: "Visualizzazione Allegati e Ottimizzazione UI",
        icon: Monitor,
        iconClass: "text-purple-500",
        changes: [
            { type: Eye, description: "Implementata una nuova visualizzazione popup per gli allegati, che mostra anteprime per immagini e PDF e offre un download sicuro per gli altri file, risolvendo i problemi di accesso diretto." },
            { type: Paperclip, description: "Aumentato il limite di dimensione per il caricamento degli allegati a 5MB." },
            { type: Tablet, description: "Migliorata significativamente la reattività dell'applicazione per schermi di medie dimensioni (tablet e laptop piccoli), ottimizzando le tabelle e la visibilità delle colonne." },
            { type: Smartphone, description: "Corretto un bug per cui il pulsante 'Crea Intervento' non era visibile su schermi di smartphone." },
            { type: Bug, description: "Risolto un errore 'Failed to fetch' che si verificava durante il tentativo di visualizzare un allegato a causa di credenziali mancanti." },
        ]
    },
    {
        version: "0.12",
        date: "2024-09-26",
        title: "Allegati, Explorer per Admin e Stabilità",
        icon: Paperclip,
        iconClass: "text-blue-500",
        changes: [
            { type: Paperclip, description: "Aggiunta la possibilità di caricare e gestire file allegati direttamente negli interventi." },
            { type: Database, description: "Implementato un Data Explorer per gli Admin, con visibilità limitata ai soli dati della propria azienda." },
            { type: Bug, description: "Risolto un bug critico che impediva il salvataggio dei log delle email a causa di un errore di riferimento." },
            { type: Wrench, description: "Rimosso l'autocompletamento del titolo durante la creazione di un intervento per migliorare la fluidità." },
            { type: Bug, description: "Corretti diversi errori di importazione e di gestione dati che causavano instabilità." },
        ]
    },
    {
        version: "0.11",
        date: "2024-09-25",
        title: "Comunicazioni Clienti e Miglioramenti Stabilità",
        icon: Mail,
        iconClass: "text-green-500",
        changes: [
            { type: MailCheck, description: "I clienti ora ricevono un'email di conferma immediata alla creazione di un nuovo intervento." },
            { type: Mail, description: "Invio automatico di email ai clienti per ogni aggiornamento di stato o commento su un intervento." },
            { type: LinkIcon, description: "Le email di aggiornamento contengono un link diretto per visualizzare i dettagli dell'intervento." },
            { type: Wrench, description: "Migliorato il soggetto delle email di notifica per includere il creatore del ticket e il cliente." },
            { type: AlertCircle, description: "Risolto un errore critico che poteva verificarsi durante l'aggiornamento degli utenti, prevenendo crash." },
            { type: Bug, description: "Risolto un bug per cui le attività recenti di interventi eliminati potevano rimanere visibili nella dashboard." },
        ]
    },
     {
        version: "0.10",
        date: "2024-09-24",
        title: "Privacy, UX e Gestione Avanzata",
        icon: Shield,
        iconClass: "text-purple-500",
        changes: [
            { type: Eye, description: "La dashboard del cliente ora mostra solo ed esclusivamente i dati relativi ai propri interventi, garantendo la privacy." },
            { type: Building, description: "Implementata la gestione completa delle aziende, con possibilità di modifica e cancellazione sicura." },
            { type: Database, description: "Corretto un bug critico che non salvava i sopralluoghi nel database, ma solo in memoria." },
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
            { type: Camera, description: "Spostato il pulsante per scattare una foto nell'intestazione della pagina, per renderlo più visibile e accessibile." },
            { type: Bug, description: "Risolto un problema per cui gli elenchi non si aggiornavano automaticamente dopo la creazione o modifica di un elemento." },
            { type: Wrench, description: "Migliorata la gestione dello stato 'loading' in tutta l'applicazione." },
        ]
    },
    { 
        version: "0.6",
        date: "2024-09-20",
        title: "Intelligenza Artificiale e Notifiche Avanzate",
        icon: ShieldCheck,
        iconClass: "text-blue-500",
        changes: [
            { type: ClipboardCheck, description: "Implementata la dashboard AI generativa che analizza i KPI e fornisce insights." },
            { type: Mail, description: "Aggiunta la configurazione SMTP per l'invio di email di notifica personalizzate." },
            { type: MailCheck, description: "Creata una notifica email automatica per gli interventi in scadenza imminente." },
            { type: Bug, description: "Risolto bug critico che impediva il login a causa di un errato controllo della password." },
        ]
    }
];


export default function CompaniesPage() {
  const { user, switchCompany, currentCompany } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  useEffect(() => {
    if (user && user.role !== 'Creator') {
      router.push('/dashboard');
      return;
    }
    
    async function fetchCompanies() {
        setIsLoading(true);
        const companiesFromDb = await getCompanies();
        setCompanies(companiesFromDb);
        setIsLoading(false);
    }
    
    if (user) {
        fetchCompanies();
    }
  }, [user, router]);
  
  const handleAddCompany = () => {
    setEditingCompany(null);
    setIsFormOpen(true);
  }

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setIsFormOpen(true);
  }

  const handleDeleteCompany = (company: Company) => {
    setCompanyToDelete(company);
    setIsDeleteDialogOpen(true);
  }
  
  const confirmDelete = async () => {
    if (!companyToDelete) return;
    try {
        await deleteCompanyAndSubcollections(companyToDelete.id);
        setCompanies(prev => prev.filter(c => c.id !== companyToDelete.id));
        toast({ title: 'Azienda eliminata', description: `L'azienda ${companyToDelete.name} è stata eliminata.` });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile eliminare l\'azienda.' });
    }
    setIsDeleteDialogOpen(false);
  }


  const handleFormSubmit = async (values: Partial<Company>) => {
    try {
      if (editingCompany) {
        const updated = await updateCompany(editingCompany.id, values);
        if (updated) {
          setCompanies(companies.map(c => c.id === updated.id ? updated : c));
          toast({ title: 'Azienda aggiornata', description: 'I dati sono stati salvati.' });
        }
      } else {
        const newCompany = await addCompany(values as Company);
        setCompanies([...companies, newCompany]);
        toast({ title: 'Azienda creata', description: `L'azienda ${newCompany.name} è stata creata.` });
      }
      return true;
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Errore',
            description: error.message || 'Si è verificato un errore.',
        });
        return false;
    }
  }
  
  const handleCardClick = (companyId: string) => {
    switchCompany(companyId);
    router.push('/dashboard');
  }

  if (isLoading || !user) {
    return (
      <>
        <Header title="Gestione Aziende" />
        <div className="flex items-center justify-center flex-1">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }
  
  if (user.role !== 'Creator') {
    return null;
  }

  return (
    <>
      <Header title="Gestione Aziende" />
      <ScrollArea className="flex-1">
        <main className="p-4 md:p-6 lg:p-8 space-y-8">

          {/* Company Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card className="flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all" onClick={handleAddCompany}>
              <CardContent className="p-6 text-center">
                <PlusCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="mt-4 font-medium">Crea Nuova Azienda</p>
              </CardContent>
            </Card>
            {companies.map(company => (
              <Card key={company.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                     <div className="flex items-center gap-3 cursor-pointer break-words" onClick={() => handleCardClick(company.id)}>
                        {company.logoUrl ? (
                            <img src={company.logoUrl} alt={company.name} className="h-10 w-10 rounded-md object-contain border p-1" />
                        ) : (
                            <Building className="h-8 w-8 text-muted-foreground shrink-0" />
                        )}
                        <span>{company.name}</span>
                     </div>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => handleEditCompany(company)}><Pencil className="mr-2"/> Modifica</DropdownMenuItem>
                               <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleDeleteCompany(company)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2"/> Elimina</DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow cursor-pointer" onClick={() => handleCardClick(company.id)}>
                  <p className="text-sm text-muted-foreground">{company.address || 'Nessun indirizzo'}</p>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                    ID: {company.id}
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <Separator />
          
          {/* Changelog */}
          <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold font-headline">Changelog MannaTic</h2>
                <p className="text-muted-foreground">Le ultime novità e miglioramenti dell'applicazione.</p>
              </div>
               <div className="space-y-8">
                {changelog.map((entry, index) => (
                    <div key={index} className="flex items-start gap-4 md:gap-8">
                        <div className="flex flex-col items-center">
                            <div className={`rounded-full p-2 bg-muted ${entry.iconClass}`}>
                                <entry.icon className="h-6 w-6 text-white" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">{entry.date}</p>
                        </div>
                        <Card className="flex-1">
                            <CardHeader>
                                <CardTitle>
                                    <Badge variant="outline" className="mr-2">v{entry.version}</Badge>
                                    {entry.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {entry.changes.map((change, cIndex) => (
                                        <li key={cIndex} className="flex items-start gap-3 text-sm">
                                            <change.type className="h-4 w-4 mt-0.5 text-primary shrink-0"/>
                                            <span className="text-muted-foreground">{change.description}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                ))}
               </div>
          </div>
        </main>
      </ScrollArea>
       <CompanyForm 
          isOpen={isFormOpen} 
          setIsOpen={setIsFormOpen} 
          onSubmit={handleFormSubmit}
          company={editingCompany}
        />
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                  Questa azione non può essere annullata. Verrà eliminata permanentemente l'azienda <b>{companyToDelete?.name}</b> e tutti i dati associati, inclusi utenti, interventi, manutenzioni e sopralluoghi.
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

    

    
