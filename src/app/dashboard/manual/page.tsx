
'use client';

import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, User, UserCog, Wrench, ShieldCheck, ClipboardCheck, Calendar, Settings, Database, PlusCircle, Eye, LayoutDashboard } from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { Loader } from 'lucide-react';

const adminGuide = [
    {
        category: "Dashboard Principale",
        icon: LayoutDashboard,
        items: [
            { title: "Panoramica KPI", description: "Visualizza gli indicatori di performance chiave come interventi aperti, aderenza SLA e manutenzioni scadute." },
            { title: "Analisi AI", description: "Leggi un'analisi testuale generata dall'AI che offre spunti e suggerimenti basati sui dati correnti." },
            { title: "Attività Recenti", description: "Tieni traccia degli ultimi aggiornamenti e commenti sugli interventi in tempo reale." },
        ]
    },
    {
        category: "Gestione Operativa",
        icon: Wrench,
        items: [
            { title: "Interventi e Nuovi Impianti", description: "Crea, modifica, assegna e monitora lo stato di tutti gli interventi, incluse le nuove installazioni." },
            { title: "Sopralluoghi", description: "Pianifica e gestisci le visite preliminari, assegnando operatori e definendo date e indirizzi." },
            { title: "Manutenzioni Programmate", description: "Imposta e traccia interventi ricorrenti, definendo periodicità e prossime scadenze." },
        ]
    },
     {
        category: "Gestione Utenti",
        icon: Users,
        items: [
            { title: "Utenti e Clienti", description: "Crea e gestisci gli account per utenti interni (Admin, Operator) e clienti. Puoi modificare i loro dati, ruoli e password." },
            { title: "Invia Credenziali", description: "Invia un'email con le credenziali di accesso a qualsiasi utente o cliente direttamente dalla tabella di gestione." },
        ]
    },
    {
        category: "Strumenti di Amministrazione",
        icon: Settings,
        items: [
            { title: "Impostazioni Azienda", description: "Configura il profilo della tua azienda, il logo e le impostazioni per l'invio di email (SMTP)." },
            { title: "Calendario", description: "Ottieni una visione d'insieme di tutti gli interventi e sopralluoghi pianificati." },
            { title: "Data Explorer", description: "Accedi a una vista tabellare di tutti i dati della tua azienda per consultazione e modifiche rapide." },
        ]
    }
];

const operatorGuide = [
     {
        category: "Dashboard Personale",
        icon: LayoutDashboard,
        items: [
            { title: "Panoramica Attività", description: "Visualizza un riepilogo degli interventi a te assegnati e le attività recenti." },
            { title: "Crea Intervento Rapido", description: "Hai la possibilità di creare un nuovo intervento direttamente dalla tua dashboard." },
        ]
    },
    {
        category: "Gestione Incarichi",
        icon: Wrench,
        items: [
            { title: "Le Tue Attività", description: "Accedi alle sezioni Interventi, Sopralluoghi e Manutenzioni per vedere solo gli incarichi a te assegnati o non ancora assegnati." },
            { title: "Aggiorna Stato e Dettagli", description: "Apri un intervento per registrarne l'avanzamento, aggiungere aggiornamenti, materiali usati e tempo impiegato." },
            { title: "Registrazione Lavoro", description: "Usa i pulsanti 'Avvia Lavoro' e 'Termina Lavoro' per tracciare automaticamente il tempo e la posizione." },
        ]
    },
    {
        category: "Strumenti",
        icon: Calendar,
        items: [
            { title: "Calendario", description: "Consulta il tuo calendario personale per visualizzare le scadenze degli interventi e gli appuntamenti dei sopralluoghi a te assegnati." },
            { title: "Profilo", description: "Puoi modificare le tue informazioni personali, come nome, avatar e password, dal menu utente in alto a destra." },
        ]
    }
];

const clientGuide = [
    {
        category: "La Tua Area Riservata",
        icon: LayoutDashboard,
        items: [
            { title: "Crea una Richiesta", description: "Dal pulsante 'Crea Intervento', puoi aprire una nuova richiesta di assistenza in modo semplice e veloce." },
            { title: "Visualizza le Tue Richieste", description: "La sezione 'Le mie Richieste' elenca tutti i tuoi interventi, passati e presenti. Clicca su un intervento per vederne i dettagli." },
        ]
    },
    {
        category: "Monitoraggio e Comunicazione",
        icon: Eye,
        items: [
            { title: "Stato in Tempo Reale", description: "Controlla lo stato di avanzamento di ogni tua richiesta (Nuovo, In corso, Completato, etc.)." },
            { title: "Cronologia Aggiornamenti", description: "All'interno del dettaglio di un intervento, puoi leggere tutti gli aggiornamenti e i commenti lasciati dai tecnici." },
            { title: "Notifiche Email", description: "Riceverai notifiche via email per la creazione di un intervento e per ogni aggiornamento significativo." },
        ]
    },
     {
        category: "Profilo",
        icon: User,
        items: [
            { title: "Gestisci il Tuo Profilo", description: "Puoi modificare le tue informazioni di contatto e la password accedendo al tuo profilo dal menu in alto a destra." },
        ]
    }
];

const GuideSection = ({ title, guideData }: { title: string, guideData: typeof adminGuide }) => (
    <div className="space-y-6">
        <h2 className="text-xl font-bold text-center">{title}</h2>
        {guideData.map((feature, index) => (
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
    </div>
);


export default function ManualPage() {
    const { user, isLoading } = useUser();

    if (isLoading || !user) {
        return (
            <>
                <Header title="Manuale Utente" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

    const isAdmin = user.role === 'Admin' || user.role === 'Creator';
    const isOperator = user.role === 'Operator';
    const isClient = user.role === 'Client';
    
    const getDefaultTab = () => {
        if (isAdmin) return "admin";
        if (isOperator) return "operator";
        if (isClient) return "client";
        return "admin";
    }

    return (
        <>
            <Header title="Manuale Utente" />
            <ScrollArea className="flex-1">
                <main className="p-4 md:p-6 lg:p-8">
                     {isAdmin ? (
                        <Tabs defaultValue="admin" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="admin">Guida Admin</TabsTrigger>
                                <TabsTrigger value="operator">Guida Operatore</TabsTrigger>
                                <TabsTrigger value="client">Guida Cliente</TabsTrigger>
                            </TabsList>
                            <TabsContent value="admin" className="pt-6">
                                <GuideSection title="Guida per Amministratori" guideData={adminGuide} />
                            </TabsContent>
                            <TabsContent value="operator" className="pt-6">
                                 <GuideSection title="Guida per Operatori" guideData={operatorGuide} />
                            </TabsContent>
                            <TabsContent value="client" className="pt-6">
                                 <GuideSection title="Guida per Clienti" guideData={clientGuide} />
                            </TabsContent>
                        </Tabs>
                     ) : isOperator ? (
                        <GuideSection title="Guida per Operatori" guideData={operatorGuide} />
                     ) : isClient ? (
                        <GuideSection title="Guida per Clienti" guideData={clientGuide} />
                     ) : null}
                </main>
            </ScrollArea>
        </>
    );
}
