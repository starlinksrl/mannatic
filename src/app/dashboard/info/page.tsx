
'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building, Users, UserCog, User, Wrench, ShieldCheck, ClipboardCheck, Bot, Palette, Server, HardDrive, ExternalLink } from 'lucide-react';

const features = [
    {
        category: "Architettura Multi-Azienda",
        icon: Building,
        items: [
            { title: "Ruolo Creator", description: "Un ruolo 'Super Admin' che può creare e gestire molteplici aziende indipendenti." },
            { title: "Isolamento Dati", description: "Ogni azienda opera in un contesto isolato, con i propri utenti, clienti e dati operativi." },
            { title: "Simulazione Utente", description: "Il Creator può 'impersonare' qualsiasi utente di qualsiasi azienda per debug e supporto." },
        ]
    },
    {
        category: "Gestione Utenti e Ruoli (RBAC)",
        icon: Users,
        items: [
            { title: "Admin", icon: UserCog, description: "Gestisce utenti, clienti e impostazioni della propria azienda. Ha visibilità su tutti i dati aziendali." },
            { title: "Operator", icon: User, description: "L'utente operativo. Visualizza e gestisce solo gli interventi a cui è assegnato." },
            { title: "Client", icon: User, description: "Il cliente finale. Può aprire nuove richieste di intervento e visualizzare lo stato delle proprie richieste." },
        ]
    },
    {
        category: "Moduli Operativi Principali",
        icon: Wrench,
        items: [
            { title: "Interventi", icon: Wrench, description: "Creazione, assegnazione e tracciamento di interventi di riparazione o assistenza. Include aggiornamenti, gestione tempo e materiali." },
            { title: "Manutenzioni Programmate", icon: ShieldCheck, description: "Impostazione di interventi ricorrenti (es. mensili) legati a specifiche attrezzature del cliente." },
            { title: "Sopralluoghi", icon: ClipboardCheck, description: "Gestione delle visite preliminari, con indirizzo, data, operatore assegnato e note." },
        ]
    },
    {
        category: "Intelligenza Artificiale (AI)",
        icon: Bot,
        items: [
            { title: "Dashboard Analitica", description: "Una dashboard che non solo mostra i KPI, ma utilizza un modello AI (Genkit) per generare un'analisi testuale e suggerimenti." },
            { title: "Notifiche Email", description: "L'AI genera il contenuto delle email per le notifiche (es. interventi in scadenza), inviate tramite un server SMTP configurabile." },
        ]
    },
    {
        category: "Stack Tecnologico",
        icon: Server,
        items: [
            { title: "Frontend", icon: Palette, description: "Next.js con App Router, React, TypeScript. Componenti UI realizzati con ShadCN e Tailwind CSS." },
            { title: "Backend & Dati", icon: Server, description: "Firebase Firestore come database NoSQL per la persistenza di tutti i dati applicativi." },
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

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-9888219348-aa634';


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
                                Monitoraggio Risorse
                            </CardTitle>
                             <CardDescription>
                                Accedi alla console Firebase per visualizzare i consumi di spazio e le performance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-4">
                                    <Database className="h-5 w-5 mt-1 text-primary" />
                                    <div className="flex-1">
                                        <p className="font-semibold">Utilizzo Database (Firestore)</p>
                                        <p className="text-sm text-muted-foreground">Controlla lo spazio di archiviazione, le letture, le scritture e le eliminazioni dei documenti.</p>
                                        <a href={`https://console.firebase.google.com/project/${projectId}/firestore/usage`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1">
                                            Vai a Firestore Usage <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <Server className="h-5 w-5 mt-1 text-primary" />
                                    <div className="flex-1">
                                        <p className="font-semibold">Utilizzo Hosting (App Hosting)</p>
                                        <p className="text-sm text-muted-foreground">Monitora il traffico di rete, lo spazio di archiviazione e l'utilizzo delle istanze del servizio.</p>
                                         <a href={`https://console.firebase.google.com/project/${projectId}/hosting/usage`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1">
                                            Vai a Hosting Usage <ExternalLink className="h-3 w-3" />
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
