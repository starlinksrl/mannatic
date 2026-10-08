
import { format } from 'date-fns';
import { Smartphone, Tablet, Phone, Monitor, Eye, Paperclip, Bug, Database, Wrench, Mail, MailCheck, Link as LinkIcon, AlertCircle, Shield, Building, MailCheck as MailCheckIcon, Users as UsersIcon, Contact, Rocket, LayoutDashboard, Camera, ShieldCheck, ClipboardCheck, GitMerge, KeyRound, MapPin, Bot, Search, LifeBuoy, Trash2, Map, Bell, NotebookPen, UserCheck, Settings, Star, Archive, Send, LayoutGrid, List, ReceiptEuro, CheckCircle2, MailPlus, FileText, UserCog, BarChart3, Edit3, Layers } from 'lucide-react';

export const changelog = [
    {
        version: "0.44",
        date: "2026-08-15",
        title: "Migrazione Architetturale a Supabase (PostgreSQL)",
        icon: Database,
        iconClass: "bg-emerald-600",
        changes: [
            { type: Database, description: "Conversione Backend su Supabase: migrazione completa dell'intera base dati applicativa da Firebase Firestore a PostgreSQL tramite Supabase SDK." },
            { type: ShieldCheck, description: "Sicurezza e DDL Relazionale: definite 11 tabelle PostgreSQL relazionali con politiche Row Level Security (RLS) e indici ad alte prestazioni." },
            { type: Rocket, description: "Migrazione Dati Trasparente: trasferiti e formattati con successo oltre 2.500 record storici da Firestore a Supabase senza perdite di dati." },
            { type: Bell, description: "Tempo Reale (Realtime): integrazione dei canali Supabase Realtime per l'aggiornamento istantaneo dell'interfaccia." }
        ]
    },
    {
        version: "0.43",
        date: "2026-07-15",
        title: "Ordinamento Interventi con Drag & Drop",
        icon: LayoutDashboard,
        iconClass: "bg-indigo-600",
        changes: [
            { type: LayoutDashboard, description: "Drag & Drop in Dashboard: consente agli amministratori e creatori di riordinare gli interventi in evidenza e urgenze trascinando le card direttamente sulla dashboard." },
            { type: Database, description: "Salvataggio Ordine su Firestore: l'ordine stabilito tramite trascinamento viene salvato in tempo reale nel database nel campo 'featuredOrder', persistendo ai ricaricamenti." },
            { type: Settings, description: "Esperienza d'uso migliorata: aggiunto indicatore di salvataggio in corso nella testata della card e notifica toast di conferma al termine dell'operazione." }
        ]
    },
    {
        version: "0.42",
        date: "2026-06-30",
        title: "Filtri e Ordinamento Supporto Tecnico",
        icon: Search,
        iconClass: "bg-cyan-600",
        changes: [
            { type: Search, description: "Ricerca Testuale: introdotta barra di ricerca rapida per cercare i ticket di supporto per oggetto o nome del cliente." },
            { type: LifeBuoy, description: "Filtri Avanzati per Stato: aggiunto il filtro per isolare i ticket attivi (Aperto/In Lavorazione) o filtrare singolarmente per specifico stato." },
            { type: Building, description: "Filtro Installatore per i Distributori: consente ai distributori di visualizzare solo i ticket di un singolo installatore gestito." },
            { type: List, description: "Ordinamento Flessibile: aggiunto ordinamento dinamico per data di aggiornamento, creazione, oggetto e nome cliente." }
        ]
    },
    {
        version: "0.41",
        date: "2026-06-10",
        title: "Integrazione WhatsApp e Gestione Allegati nei Ticket",
        icon: Phone,
        iconClass: "bg-green-600",
        changes: [
            { type: Phone, description: "Integrazione WhatsApp Business API: aggiunto pannello di configurazione credenziali Meta Cloud API per ciascuna azienda/installatore, con invio di notifiche automatiche all'apertura dei ticket." },
            { type: Paperclip, description: "Allegati nei Ticket di Supporto: possibilità di caricare e scaricare file e immagini (fino a 10MB) all'interno della conversazione di supporto, completa di anteprime." },
            { type: LayoutDashboard, description: "Nuova sezione Interventi Urgenti nella dashboard ordinata per priorità e data di scadenza, con visualizzazione semplificata degli interventi attivi." },
            { type: Wrench, description: "Corretta la formattazione dei testi in MAIUSCOLO per l'oggetto dei ticket e i nomi dei clienti per migliorare la leggibilità negli elenchi." },
            { type: Mail, description: "Migliorato l'invio delle email di riepilogo in formato HTML per supportare gli operatori multipli (assignedOperatorIds)." }
        ]
    },
    {
        version: "0.40",
        date: "2026-05-13",
        title: "Gerarchia Utenti e Terminologia Installatori",
        icon: Layers,
        iconClass: "bg-violet-600",
        changes: [
            { type: Layers, description: "Chiarita la gerarchia utenti: Creator → Distributori → Installatori → Clienti. Il Creator può creare sia Distributori che Installatori diretti." },
            { type: Building, description: "Rinominato 'Azienda' in 'Installatore' in tutta la piattaforma per riflettere la struttura corretta del sistema." },
            { type: UsersIcon, description: "I Distributori possono creare e gestire i propri Installatori; gli Installatori a loro volta gestiscono i loro Clienti finali." },
        ]
    },
    {
        version: "0.39",
        date: "2026-05-12",
        title: "Gestione Operatori Distributore e Preventivi Avanzati",
        icon: UserCog,
        iconClass: "bg-teal-600",
        changes: [
            { type: UserCog, description: "Il Distributore può ora creare utenti 'Operatori' (Admin o semplici Utenti) per delegare la gestione dei ticket e preventivi." },
            { type: BarChart3, description: "Nuova scheda 'Statistiche' per monitorare le performance del team del distributore (ticket gestiti, preventivi caricati, tempi di risposta)." },
            { type: Edit3, description: "I preventivi ora supportano i campi 'Riferimento', 'Scadenza' e 'Descrizione', e possono essere modificati dal distributore dopo il caricamento." },
            { type: Search, description: "Ricerca full-text intelligente: all'upload del PDF viene estratto il testo interno, permettendo di cercare i preventivi anche per contenuto del documento." },
        ]
    },
    {
        version: "0.38",
        date: "2026-05-08",
        title: "Gestione Preventivi Distributore",
        icon: FileText,
        iconClass: "bg-blue-600",
        changes: [
            { type: FileText, description: "Nuova sezione 'Preventivi': il Distributore può caricare PDF preventivo direttamente in Firebase Storage, visibili a ogni singola Installatore." },
            { type: LayoutDashboard, description: "Le Installatori possono visualizzare e scaricare i preventivi ricevuti dal proprio Distributore dalla nuova voce di menu 'Preventivi'." },
            { type: Trash2, description: "Il Distributore può eliminare i preventivi caricati: il file viene rimosso sia da Firestore che da Firebase Storage." },
        ]
    },
    {
        version: "0.37",
        date: "2026-05-07",
        title: "Supporto Distributore e Gestione Ticket Multi-livello",
        icon: LifeBuoy,
        iconClass: "bg-orange-600",
        changes: [
            { type: Building, description: "Introdotta la possibilità per le installatori (Admin) di aprire ticket di supporto diretti verso il proprio Distributore." },
            { type: LifeBuoy, description: "Aggiunto sistema di routing intelligente delle notifiche email e in-app, distinguendo i ticket dei Clienti finali da quelli diretti al Distributore." },
            { type: LayoutDashboard, description: "Nuova interfaccia a tab per la sezione Supporto, che separa le richieste in entrata (da clienti) da quelle in uscita (verso distributori)." },
        ]
    },
    {
        version: "0.36",
        date: "2026-05-07",
        title: "Navigazione Migliorata e Deploy Pubblico",
        icon: Rocket,
        iconClass: "bg-emerald-600",
        changes: [
            { type: Rocket, description: "Prima pubblicazione dell'app su Firebase App Hosting: l'applicazione è ora accessibile online all'indirizzo pubblico." },
            { type: Wrench, description: "Aggiunto il pulsante 'Torna indietro' nella scheda di modifica intervento, visibile in alto a sinistra sia su desktop (nell'intestazione del dialogo) che su dispositivi mobili (fisso nell'angolo superiore sinistro)." },
            { type: LayoutDashboard, description: "Migliorata la navigazione generale: ora è possibile uscire dal form di modifica intervento senza dover cercare il pulsante di chiusura." },
        ]
    },
    {
        version: "0.35",
        date: "2025-12-18",
        title: "Riepiloghi Interventi via Email",
        icon: MailPlus,
        iconClass: "bg-blue-600",
        changes: [
            { type: MailPlus, description: "Introdotto il pulsante 'Invia Riepilogo' per gli amministratori: invia via email l'elenco degli interventi filtrati agli operatori scelti." },
            { type: LayoutDashboard, description: "Migliorata la visualizzazione dei totali economici nella dashboard, ora visibili anche ai clienti per i propri interventi." },
            { type: Wrench, description: "Risolto un conflitto di dipendenze che impediva la corretta compilazione del progetto in alcuni ambienti." },
        ]
    },
    {
        version: "0.34",
        date: "2025-12-17",
        title: "Esperienza Visiva Migliorata",
        icon: LayoutGrid,
        iconClass: "bg-indigo-600",
        changes: [
            { type: LayoutGrid, description: "Impostata la modalità 'Post-it' come visualizzazione predefinita per tutti gli elenchi interventi su desktop." },
            { type: Wrench, description: "Sincronizzata la modalità predefinita anche per la sezione Nuovi Impianti." },
            { type: LayoutDashboard, description: "Ottimizzata la coerenza visiva tra le diverse sezioni della dashboard operativa." },
        ]
    },
    {
        version: "0.33",
        date: "2025-12-16",
        title: "Gestione Economica e Persistenza",
        icon: ReceiptEuro,
        iconClass: "bg-purple-600",
        changes: [
            { type: ReceiptEuro, description: "Introdotto il campo 'Costo' negli interventi, gestibile dagli Admin e visibile ai Clienti in fase di fatturazione." },
            { type: LayoutDashboard, description: "Aggiunto il calcolo del 'Totale da Fatturare' nella dashboard Admin e Cliente per un controllo finanziario immediato." },
            { type: Search, description: "Implementata la persistenza totale dei filtri e della modalità di visualizzazione nell'elenco interventi tramite sincronizzazione URL." },
            { type: CheckCircle2, description: "Nuovo pulsante 'Chiudi Intervento' rapido con controllo intelligente sulla compilazione di ore e materiali." },
            { type: KeyRound, description: "Risolto il malfunzionamento della funzione 'Entra come Cliente', ora pienamente operativa in tutti gli ambienti." },
            { type: Bug, description: "Filtrati i ticket di supporto nella dashboard cliente per mostrare solo le richieste attive (Aperto/In Lavorazione)." },
            { type: Wrench, description: "Ottimizzate le dipendenze e risolti i conflitti di compilazione relativi alla gestione delle date." },
        ]
    }
];
