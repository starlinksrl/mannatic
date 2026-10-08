
'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building, Users, UserCog, User, Wrench, ShieldCheck, ClipboardCheck, Bot, Palette, Server, HardDrive, ExternalLink, Database, FileText, FolderArchive, LifeBuoy, NotebookPen } from 'lucide-react';

const features = [
    {
        category: "Architettura Multi-Creator e Multi-Installatore",
        icon: Building,
        items: [
            { title: "Ruolo Main Creator", description: "Un 'Super Admin' globale (creator@mannatic.com) che può creare altri Creator e importare installatori esistenti." },
            { title: "Ruolo Creator", description: "Un ruolo amministrativo che può creare e gestire molteplici installatori indipendenti." },
            { title: "Isolamento Dati", description: "Ogni installatore opera in un contesto isolato, con i propri utenti, clienti e dati operativi." },
        ]
    },
    {
        category: "Gestione Utenti e Ruoli (RBAC)",
        icon: Users,
        items: [
            { title: "Admin", icon: UserCog, description: "Gestisce utenti, clienti e impostazioni del proprio installatore. Ha visibilità su tutti i dati dell'installatore." },
            { title: "Operator", icon: User, description: "L'utente operativo. Visualizza e gestisce solo gli interventi a cui è assegnato, con la possibilità di tracciare le ore di lavoro." },
            { title: "Client", icon: User, description: "Il cliente finale. Può aprire nuove richieste di intervento e ticket di supporto, e visualizzare lo stato delle proprie richieste." },
        ]
    },
    {
        category: "Moduli Operativi Principali",
        icon: Wrench,
        items: [
            { title: "Interventi e Nuovi Impianti", icon: Wrench, description: "Creazione, assegnazione e tracciamento di interventi. Include gestione aggiornamenti, tempo e materiali, e allegati." },
            { title: "Appuntamenti (ex Sopralluoghi)", icon: ClipboardCheck, description: "Gestione delle visite preliminari, con indirizzo geolocalizzato, data, operatore assegnato e note." },
            { title: "Manutenzioni Programmate", icon: ShieldCheck, description: "Impostazione di interventi ricorrenti (es. mensili) legati a specifiche attrezzature del cliente." },
            { title: "Supporto Tecnico", icon: LifeBuoy, description: "Un sistema di ticketing per la comunicazione tra clienti e amministratori per richieste non legate a interventi specifici." },
            { title: "Promemoria", icon: NotebookPen, description: "Blocchi note integrati nella dashboard per appunti personali (privati) e condivisi col team." },
        ]
    },
    {
        category: "Strumenti e Dati",
        icon: Database,
        items: [
            { title: "Data Explorer (Admin)", description: "Gli Admin possono visualizzare e modificare direttamente i dati della propria installatore (interventi, utenti, etc.) attraverso un'interfaccia tabellare." },
            { title: "Data Explorer (Creator)", description: "Il Main Creator ha una vista globale su tutti i dati di tutte le collezioni del database." },
        ]
    },
    {
        category: "Intelligenza Artificiale (Genkit)",
        icon: Bot,
        items: [
            { title: "Dashboard Analitica", description: "Una dashboard che non solo mostra i KPI, ma utilizza un modello AI per generare un'analisi testuale e suggerimenti." },
            { title: "Notifiche Email", description: "L'AI genera il contenuto delle email per notifiche importanti, come il reset della password." },
        ]
    },
    {
        category: "Stack Tecnologico",
        icon: Server,
        items: [
            { title: "Frontend", icon: Palette, description: "Next.js con App Router, React, TypeScript. Componenti UI realizzati con ShadCN e Tailwind CSS." },
            { title: "Backend & Dati", icon: Server, description: "Supabase (PostgreSQL) come database relazionale con RLS per la persistenza e le funzionalità in tempo reale." },
        ]
    }
];

export default function InfoPage() {
    const { user } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (user && user.role !== 'Creator') {
            router.push('/dashboard');
        }
    }, [user, router]);

    if (!user || user.role !== 'Creator') {
        return null; // Render nothing or a loader while redirecting
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.com/dashboard';

    return (
        <>
            <Header title="Informazioni Applicazione" />
            <ScrollArea className="flex-1">
                <main className="p-4 md:p-6 lg:p-8 space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold font-headline">Panoramica Funzionale di MannaTic</h1>
                        <p className="text-muted-foreground">Un riepilogo delle caratteristiche e dell'architettura dell'applicazione.</p>
                    </div>

                    {features.map((feature, index) => (
                        <Card key={index}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <feature.icon className="h-6 w-6" />
                                    {feature.category}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    {feature.items.map((item, itemIndex) => (
                                        <li key={itemIndex} className="flex items-start gap-4">
                                             {item.icon && <item.icon className="h-5 w-5 mt-1 text-primary" />}
                                            <div className="flex-1">
                                                <p className="font-semibold">{item.title}</p>
                                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <HardDrive className="h-6 w-6" />
                                Monitoraggio Risorse Supabase
                            </CardTitle>
                             <CardDescription>
                                Accedi alla console Supabase per visualizzare la struttura delle tabelle, i dati e i log di rete.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                 <li className="flex items-start gap-4">
                                    <Database className="h-5 w-5 mt-1 text-primary" />
                                    <div className="flex-1">
                                        <p className="font-semibold">Database (Supabase PostgreSQL)</p>
                                        <p className="text-sm text-muted-foreground">Esplora e gestisci direttamente le tabelle e le politiche RLS nel database.</p>
                                        <a href={supabaseUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1">
                                            Vai alla Dashboard Supabase <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </li>
                                 <li className="flex items-start gap-4">
                                    <FileText className="h-5 w-5 mt-1 text-primary" />
                                    <div className="flex-1">
                                        <p className="font-semibold">Log Applicazione (Cloud Logging)</p>
                                        <p className="text-sm text-muted-foreground">Visualizza i log del server, incluse le operazioni AI e l'invio delle email.</p>
                                        <a href={supabaseUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1">
                                            Vai ai Log <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </main>
            </ScrollArea>
        </>
    );
}
