import { format } from 'date-fns';
import { Smartphone, Tablet, Phone, Monitor, Eye, Paperclip, Bug, Database, Wrench, Mail, MailCheck, Link as LinkIcon, AlertCircle, Shield, Building, MailCheck as MailCheckIcon, Users as UsersIcon, Contact, Rocket, LayoutDashboard, Camera, ShieldCheck, ClipboardCheck, GitMerge, KeyRound, MapPin, Bot, Search, LifeBuoy, Trash2, Map, Bell, NotebookPen, UserCheck, Settings, Star, Archive, Send, LayoutGrid, List, ReceiptEuro, CheckCircle2 } from 'lucide-react';

export const changelog = [
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
    },
    {
        version: "0.32",
        date: "2025-12-15",
        title: "Visualizzazione Post-it",
        icon: LayoutGrid,
        iconClass: "bg-yellow-400",
        changes: [
            { type: LayoutGrid, description: "Aggiunta una nuova modalità di visualizzazione 'Post-it' per l'elenco interventi, che permette di vedere le attività in un formato a griglia colorata." },
            { type: List, description: "Possibilità di passare rapidamente dalla vista a Tabella alla vista Post-it tramite un selettore dedicato." },
        ]
    },
    {
        version: "0.31",
        date: "2025-12-14",
        title: "Sollecito Operatori e Miglioramenti UX",
        icon: Send,
        iconClass: "bg-blue-500",
        changes: [
            { type: Send, description: "Aggiunto un pulsante 'Sollecita' per inviare un'email di promemoria agli operatori per la compilazione dei dettagli intervento." },
            { type: LinkIcon, description: "L'email di sollecito contiene un link diretto che apre l'app e la finestra di modifica dell'intervento specifico." },
            { type: Bug, description: "Corretto un bug per cui il pulsante 'Archivia' non era visibile su tutti gli interventi come previsto." },
        ]
    },
     {
        version: "0.30",
        date: "2025-12-13",
        title: "Gestione Archivio Flessibile",
        icon: Archive,
        iconClass: "bg-gray-500",
        changes: [
            { type: Archive, description: "Aggiunto il pulsante 'Archivia' al menu azioni di ogni intervento, visibile per Admin e Creator." },
            { type: Eye, description: "Il pulsante 'Archivia' è ora disponibile per tutti gli interventi, indipendentemente dal loro stato, per una maggiore flessibilità." },
        ]
    },
     {
        version: "0.29",
        date: "2025-12-12",
        title: "Miglioramenti Dashboard e Stabilità",
        icon: Rocket,
        iconClass: "bg-green-500",
        changes: [
            { type: Star, description: "Gli interventi in evidenza vengono rimossi automaticamente dalla dashboard una volta completati, mantenendo la sezione focalizzata sulle vere priorità." },
            { type: Bug, description: "Risolto un problema critico che impediva l'avvio dell'applicazione a causa di conflitti con le dipendenze di Intelligenza Artificiale." },
            { type: Wrench, description: "Disattivate temporaneamente tutte le funzionalità basate su AI (Genkit) per garantire la stabilità e l'avvio del progetto. Saranno reintrodotte in una versione futura." },
        ]
    },
    {
        version: "0.28",
        date: "2025-12-11",
        title: "Stabilità Applicazione e Rimozione Funzionalità AI",
        icon: Bug,
        iconClass: "bg-red-500",
        changes: [
            { type: Bug, description: "Risolto un problema critico che impediva l'avvio dell'applicazione a causa di conflitti con le dipendenze di Intelligenza Artificiale." },
            { type: Wrench, description: "Disattivate temporaneamente tutte le funzionalità basate su AI (Genkit) per garantire la stabilità e l'avvio del progetto. Saranno reintrodotte in una versione futura." },
        ]
    }
];
