
import { format } from 'date-fns';
import { Smartphone, Tablet, Phone, Monitor, Eye, Paperclip, Bug, Database, Wrench, Mail, MailCheck, Link as LinkIcon, AlertCircle, Shield, Building, MailCheck as MailCheckIcon, Users as UsersIcon, Contact, Rocket, LayoutDashboard, Camera, ShieldCheck, ClipboardCheck, GitMerge, KeyRound, MapPin, Bot, Search, LifeBuoy, Trash2, Map, Bell, NotebookPen, UserCheck, Settings, Star, Archive, Send, LayoutGrid, List, ReceiptEuro, CheckCircle2, MailPlus } from 'lucide-react';

export const changelog = [
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
