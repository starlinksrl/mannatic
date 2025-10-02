
import { format } from 'date-fns';
import { Smartphone, Tablet, Phone, Monitor, Eye, Paperclip, Bug, Database, Wrench, Mail, MailCheck, Link as LinkIcon, AlertCircle, Shield, Building, MailCheck as MailCheckIcon, Users as UsersIcon, Contact, Rocket, LayoutDashboard, Camera, ShieldCheck, ClipboardCheck, GitMerge } from 'lucide-react';

export const changelog = [
    {
        version: "0.15",
        date: format(new Date(), 'yyyy-MM-dd'),
        title: "Accessibilità Changelog e Refactoring",
        icon: GitMerge,
        iconClass: "text-blue-500",
        changes: [
            { type: GitMerge, description: "Aggiunta una pagina 'Changelog' accessibile a tutti gli utenti per visualizzare le novità." },
            { type: Eye, description: "Inserito un badge con la versione attuale in basso a destra, cliccabile per aprire il changelog." },
            { type: Wrench, description: "Spostati i dati del changelog in un file dedicato per una migliore manutenibilità." },
        ]
    },
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
            { type: MailCheckIcon, description: "Le notifiche vengono ora contrassegnate automaticamente come lette all'apertura del menu, migliorando l'usabilità." },
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
            { type: MailCheck, description: "Risolto definitivamente il problema delle notifiche email per i new interventi, adottando un sistema di invio diretto più robusto." },
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
