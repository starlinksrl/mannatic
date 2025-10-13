
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/contexts/user-context';
import { LayoutDashboard, Wrench, Users, Settings, LifeBuoy, Palette, GitMerge, Eye, Calendar, User, HelpCircle } from 'lucide-react';

const adminGuide = [
    {
        category: "Dashboard Principale",
        icon: LayoutDashboard,
        items: [
            { title: "Panoramica KPI", description: "Visualizza gli indicatori di performance chiave come interventi aperti, aderenza SLA e manutenzioni scadute." },
            { title: "Analisi AI", description: "Leggi un'analisi testuale generata dall'AI che offre spunti e suggerimenti basati sui dati correnti." },
            { title: "Personalizzazione Layout", description: "Clicca su 'Modifica Layout' per trascinare e ridimensionare i riquadri della dashboard a tuo piacimento. Clicca 'Salva Layout' per memorizzare la configurazione." },
        ]
    },
    {
        category: "Gestione Operativa",
        icon: Wrench,
        items: [
            { title: "Interventi e Nuovi Impianti", description: "Crea, modifica, assegna e monitora lo stato di tutti gli interventi, incluse le nuove installazioni. Allega file e registra le ore di lavoro." },
            { title: "Sopralluoghi", description: "Pianifica e gestisci le visite preliminari, assegnando operatori e definendo indirizzi geolocalizzati." },
            { title: "Manutenzioni Programmate", description: "Imposta e traccia interventi ricorrenti, definendo periodicità e prossime scadenze." },
        ]
    },
     {
        category: "Gestione Utenti e Supporto",
        icon: Users,
        items: [
            { title: "Utenti e Clienti", description: "Crea e gestisci gli account per utenti interni (Admin, Operator) e clienti. Puoi modificare i loro dati, ruoli e password." },
            { title: "Supporto Tecnico", description: "Gestisci i ticket di supporto aperti dai clienti, rispondi ai messaggi e aggiorna lo stato delle richieste." },
        ]
    },
    {
        category: "Strumenti e Impostazioni",
        icon: Settings,
        items: [
            { title: "Impostazioni Azienda", description: "Configura il profilo della tua azienda, il logo e le impostazioni per l'invio di email (SMTP)." },
            { title: "Aspetto (Tema)", description: "Personalizza la palette di colori dell'interfaccia per tutta la tua azienda scegliendo tra diversi temi predefiniti." },
            { title: "Calendario e Mappa", description: "Usa il filtro sulla Mappa Operativa per visualizzare separatamente le attività aperte, i sopralluoghi pianificati o tutti i clienti. Il calendario mostra tutte le scadenze." },
            { title: "Changelog e Manuale", description: "Consulta le ultime novità dell'applicazione e questa guida direttamente dalle impostazioni." },
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
            { title: "Aggiorna Stato e Dettagli", description: "Apri un intervento per registrarne l'avanzamento, aggiungere aggiornamenti, materiali usati, tempo impiegato e allegati." },
            { title: "Registrazione Lavoro", description: "Usa i pulsanti 'Avvia Lavoro' e 'Termina Lavoro' per tracciare automaticamente il tempo e la posizione." },
        ]
    },
    {
        category: "Strumenti",
        icon: Calendar,
        items: [
            { title: "Calendario e Mappa", description: "Consulta il tuo calendario e la mappa operativa. Usa il filtro sulla mappa per visualizzare le attività aperte o i sopralluoghi a te assegnati." },
            { title: "Profilo", description: "Puoi modificare le tue informazioni personali, come nome, avatar e password, dal menu utente in alto a destra." },
        ]
    }
];

const clientGuide = [
    {
        category: "La Tua Area Riservata",
        icon: LayoutDashboard,
        items: [
            { title: "Crea una Richiesta di Intervento", description: "Dal pulsante 'Crea Intervento' nella sezione Interventi, puoi aprire una nuova richiesta di assistenza in modo semplice e veloce, allegando anche file se necessario." },
            { title: "Visualizza i Tuoi Interventi", description: "La sezione 'Interventi' elenca tutti i tuoi interventi, passati e presenti. Clicca su un intervento per vederne i dettagli." },
        ]
    },
    {
        category: "Assistenza e Supporto",
        icon: LifeBuoy,
        items: [
            { title: "Apri un Ticket di Supporto", description: "Nella sezione 'Supporto', puoi creare un ticket per porre domande o richiedere assistenza non legata a un intervento specifico." },
            { title: "Comunica con l'Assistenza", description: "Visualizza le risposte ai tuoi ticket e invia ulteriori messaggi direttamente dalla piattaforma." },
        ]
    },
    {
        category: "Monitoraggio e Comunicazione",
        icon: Eye,
        items: [
            { title: "Stato in Tempo Reale", description: "Controlla lo stato di avanzamento di ogni tua richiesta (Nuovo, In corso, Completato, etc.)." },
            { title: "Cronologia Aggiornamenti", description: "All'interno del dettaglio di un intervento, puoi leggere tutti gli aggiornamenti e i commenti lasciati dai tecnici." },
            { title: "Notifiche Email e In-App", description: "Riceverai notifiche via email e all'interno dell'app per ogni aggiornamento significativo." },
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


export default function ManualPageContent() {
    const { user } = useUser();
    
    if (!user) return null;

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
        isAdmin ? (
            <Tabs defaultValue={getDefaultTab()} className="w-full">
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
         ) : null
    );
}
