
import { format } from 'date-fns';
import { Smartphone, Tablet, Phone, Monitor, Eye, Paperclip, Bug, Database, Wrench, Mail, MailCheck, Link as LinkIcon, AlertCircle, Shield, Building, MailCheck as MailCheckIcon, Users as UsersIcon, Contact, Rocket, LayoutDashboard, Camera, ShieldCheck, ClipboardCheck, GitMerge, KeyRound, MapPin, Bot, Search, LifeBuoy, Trash2, Map, Bell, NotebookPen, UserCheck, Settings } from 'lucide-react';

export const changelog = [
    {
        version: "0.27",
        date: "2024-10-13",
        title: "Statistiche Operatore e Notifiche Assegnazione",
        icon: LayoutDashboard,
        iconClass: "bg-teal-500",
        changes: [
            { type: LayoutDashboard, description: "Potenziato il box 'Carico di Lavoro Operatori' con un grafico a barre per interventi aperti/chiusi e l'aggiunta del tempo medio di chiusura per operatore." },
            { type: MailCheck, description: "Implementata una notifica email automatica inviata a un operatore quando gli viene assegnato un nuovo intervento." },
            { type: Bug, description: "Risolto un problema con l'ordinamento per 'interventi evidenziati', che ora funziona correttamente." },
            { type: GitMerge, description: "Aggiunto un identificatore di checkpoint specifico accanto al numero di versione nella barra laterale." },
        ]
    },
    {
        version: "0.26",
        date: "2024-10-12",
        title: "Personalizzazione Notifiche Cron Job",
        icon: MailCheckIcon,
        iconClass: "bg-orange-500",
        changes: [
            { type: Settings, description: "Aggiunta una nuova scheda 'Notifiche' nelle Impostazioni dell'azienda per personalizzare i destinatari delle email automatiche." },
            { type: UsersIcon, description: "Gli amministratori possono ora selezionare quali operatori specifici riceveranno i riepiloghi via email generati dai cron job." },
            { type: Wrench, description: "Aggiornata la logica di invio dei cron job per rispettare i destinatari personalizzati, con un fallback al comportamento predefinito se non viene specificato nessuno." },
        ]
    },
    {
        version: "0.25",
        date: "2024-10-11",
        title: "Dashboard Personalizzata e Programmazione Settimanale",
        icon: LayoutDashboard,
        iconClass: "bg-blue-500",
        changes: [
            { type: LayoutDashboard, description: "Aggiunto un riquadro 'Programmazione Settimanale' in dashboard per una visione chiara degli impegni dei prossimi 7 giorni." },
            { type: UserCheck, description: "Introdotta la card 'Interventi Assegnati' con logica differenziata: gli admin vedono il totale, gli operatori solo i propri." },
            { type: Eye, description: "La programmazione settimanale degli operatori ora mostra solo le attività per cui sono abilitati, rendendo la vista più pulita e pertinente." },
            { type: Wrench, description: "Migliorata la logica dei KPI nel 'Riepilogo Attività' per dare agli operatori una visione globale pur mantenendo un focus sui propri incarichi." },
        ]
    },
    {
        version: "0.24",
        date: "2024-10-10",
        title: "Dashboard Operatori Potenziata",
        icon: UserCheck,
        iconClass: "bg-green-500",
        changes: [
            { type: LayoutDashboard, description: "Aggiunto il riquadro 'Interventi Assegnati' al Riepilogo Attività per un monitoraggio rapido del carico di lavoro." },
            { type: Wrench, description: "Differenziata la logica di visualizzazione: gli Admin vedono tutti gli interventi assegnati, mentre gli Operatori vedono solo i propri." },
            { type: Search, description: "Corretto il link sulla card 'Interventi Assegnati' per filtrare correttamente l'elenco degli interventi specifici dell'operatore." },
        ]
    },
    {
        version: "0.23",
        date: "2024-10-09",
        title: "Standardizzazione Appuntamenti e Dashboard Operatori",
        icon: ClipboardCheck,
        iconClass: "bg-cyan-500",
        changes: [
            { type: Wrench, description: "Standardizzata la terminologia in tutta l'app, sostituendo 'Sopralluoghi' con 'Appuntamenti' per coerenza." },
            { type: Database, description: "Implementata una migrazione automatica e sicura per convertire tutti i vecchi 'Sopralluoghi' in 'Appuntamenti', senza perdita di dati." },
            { type: LayoutDashboard, description: "Migliorata la dashboard degli operatori con un box unificato per il riepilogo degli interventi (Urgenti, Nuovi, In Corso)." },
            { type: Eye, description: "Corretta la logica di visualizzazione dei box nella dashboard per rispettare i permessi specifici degli operatori (es. visualizzazione appuntamenti)." },
            { type: Trash2, description: "Rimosso il codice obsoleto relativo ai vecchi 'Sopralluoghi' per una maggiore pulizia e manutenibilità." },
        ]
    },
    {
        version: "0.22",
        date: "2024-10-08",
        title: "Promemoria e Note Integrate",
        icon: NotebookPen,
        iconClass: "bg-yellow-500",
        changes: [
            { type: NotebookPen, description: "Aggiunto un riquadro 'Promemoria Personale' sulla dashboard, dove ogni utente può salvare i propri appunti privati." },
            { type: Building, description: "Introdotto un 'Promemoria Aziendale' condiviso, visibile a tutti gli utenti dell'azienda ma modificabile solo dagli Admin, per comunicazioni importanti." },
            { type: Wrench, description: "Entrambi i promemoria salvano automaticamente il testo durante la digitazione per non perdere nessuna informazione." },
        ]
    },
    {
        version: "0.21",
        date: "2024-10-07",
        title: "Stabilità e Miglioramenti UX",
        icon: Rocket,
        iconClass: "bg-teal-500",
        changes: [
            { type: Bell, description: "Risolto un problema critico che impediva il corretto funzionamento delle notifiche push per tutti gli utenti, che ora sono pienamente operative." },
            { type: Smartphone, description: "Migliorata la visualizzazione dell'elenco clienti e della pagina Impostazioni su dispositivi mobili per evitare sovrapposizioni." },
            { type: Bug, description: "Corretto un errore che impediva la corretta compilazione dell'app Android a causa di un'icona mancante." },
            { type: Wrench, description: "La pagina di conversazione dei ticket di supporto ora si aggiorna automaticamente dopo l'invio di un nuovo messaggio." },
        ]
    },
    {
        version: "0.20",
        date: "2024-10-06",
        title: "Sistema di Notifiche Push e Stabilità API Mappe",
        icon: Bell,
        iconClass: "bg-red-500",
        changes: [
            { type: Bell, description: "Aggiunto un sistema di notifiche push per avvisare gli utenti su nuovi interventi e aggiornamenti importanti, anche quando non hanno l'app aperta." },
            { type: Map, description: "Risolto in modo definitivo l'errore 'ApiProjectMapError' e 'ApiTargetBlockedMapError' utilizzando una chiave API dedicata e correttamente configurata." },
            { type: Bug, description: "Stabilizzato il caricamento delle mappe, eliminando gli errori intermittenti legati alla configurazione della chiave API." },
            { type: Wrench, description: "Effettuata una revisione completa del sistema di notifiche per garantire l'affidabilità dell'invio di email, notifiche in-app e push." },
        ]
    },
    {
        version: "0.19",
        date: "2024-10-05",
        title: "Mappa Operativa Potenziata e Geolocalizzazione Sopralluoghi",
        icon: Map,
        iconClass: "bg-purple-500",
        changes: [
            { type: Map, description: "Aggiunto un filtro dedicato sulla Mappa Operativa per visualizzare separatamente Interventi, Sopralluoghi e Clienti." },
            { type: MapPin, description: "I sopralluoghi ora hanno coordinate geografiche proprie, indipendenti da quelle del cliente, per una localizzazione precisa." },
            { type: Wrench, description: "Migliorata l'iconografia sulla mappa, utilizzando un puntatore viola per i sopralluoghi per coerenza visiva." },
            { type: Bug, description: "Risolto un bug che impediva la visualizzazione dei sopralluoghi sulla mappa." },
        ]
    },
    {
        version: "0.18",
        date: "2024-10-04",
        title: "Modulo Supporto Tecnico e Controllo Notifiche",
        icon: LifeBuoy,
        iconClass: "bg-indigo-500",
        changes: [
            { type: LifeBuoy, description: "Introdotto un nuovo modulo 'Supporto' che permette ai clienti di aprire ticket di assistenza e agli admin di rispondere, centralizzando la comunicazione." },
            { type: Wrench, description: "Semplificata la navigazione per i clienti rimuovendo la voce di menu 'Le mie Richieste' e integrando tutto nella vista 'Interventi'." },
            { type: MailCheck, description: "Aggiunto un checkbox nei moduli di creazione e modifica intervento per dare all'operatore il pieno controllo sull'invio delle notifiche email al cliente." },
            { type: Trash2, description: "Implementata la funzionalità di eliminazione completa per i ticket di supporto da parte degli amministratori." },
        ]
    },
    {
        version: "0.17",
        date: "2024-10-03",
        title: "Miglioramenti Mappa, AI Logistica e Gestione Clienti",
        icon: Rocket,
        iconClass: "bg-green-500",
        changes: [
            { type: MapPin, description: "Aggiunto pulsante 'Localizza' nei moduli cliente per inserire automaticamente le coordinate geografiche." },
            { type: Eye, description: "La mappa ora si centra e zooma automaticamente per mostrare tutti i clienti filtrati." },
            { type: Bot, description: "L'analisi AI sulla dashboard ora suggerisce raggruppamenti logistici per interventi in zone vicine." },
            { type: Paperclip, description: "Aggiunto un campo 'Appunti Cliente' con editor completo per note dettagliate." },
            { type: Search, description: "Implementata una barra di ricerca universale nella tabella dei clienti per filtrare su qualsiasi campo." },
            { type: Wrench, description: "Migliorato il filtro 'interventi aperti' sulla mappa per includere nuovi impianti e manutenzioni imminenti." },
            { type: MapPin, description: "I puntatori sulla mappa per i 'Nuovi Impianti' sono ora di colore blu per una migliore distinzione visiva." },
        ]
    },
     {
        version: "0.16",
        date: "2024-10-02",
        title: "Gestione Credenziali Clienti",
        icon: KeyRound,
        iconClass: "bg-yellow-500",
        changes: [
            { type: KeyRound, description: "Aggiunta la possibilità per gli Admin di impostare e modificare la password per gli account Cliente." },
            { type: Mail, description: "Implementata la funzionalità 'Invia Credenziali' anche per i clienti, per notificare loro le informazioni di accesso." },
            { type: Wrench, description: "Rimosso il blocco che impediva l'invio delle credenziali agli utenti con ruolo 'Cliente'." },
            { type: GitMerge, description: "Aggiornato il changelog con le nuove funzionalità." },
        ]
    },
    {
        version: "0.15",
        date: "2024-10-01",
        title: "Accessibilità Changelog e Refactoring",
        icon: GitMerge,
        iconClass: "bg-blue-500",
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
        iconClass: "bg-green-500",
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
        iconClass: "bg-purple-500",
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
        iconClass: "bg-blue-500",
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
        iconClass: "bg-green-500",
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
        iconClass: "bg-purple-500",
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
        iconClass: "bg-green-500",
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
        iconClass: "bg-blue-500",
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
        iconClass: "bg-green-500",
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
        iconClass: "bg-blue-500",
        changes: [
            { type: ClipboardCheck, description: "Implementata la dashboard AI generativa che analizza i KPI e fornisce insights." },
            { type: Mail, description: "Aggiunta la configurazione SMTP per l'invio di email di notifica personalizzate." },
            { type: MailCheck, description: "Creata una notifica email automatica per gli interventi in scadenza imminente." },
            { type: Bug, description: "Risolto bug critico che impediva il login a causa di un errato controllo della password." },
        ]
    }
];

    

    

