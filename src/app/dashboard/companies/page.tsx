
'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Company, addCompany, getCompanies, deleteCompanyAndSubcollections, updateCompany } from '@/lib/data';
import { Loader, PlusCircle, Building, Mail, Phone, Rocket, Bug, Wrench, ShieldCheck, ClipboardCheck, MailCheck, LayoutDashboard, Users as UsersIcon, Contact, MoreHorizontal, Pencil, Trash2, Shield, Eye, Database } from 'lucide-react';
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
            { typecamera