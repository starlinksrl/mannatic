

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
            { title: "Riepilogo Attività", description: "Monitora in tempo reale il carico di lavoro con i contatori degli interventi (Urgenti, Nuovi, In Corso, Assegnati) e dei nuovi impianti aperti. Ogni riquadro è cliccabile per accedere direttamente alla vista filtrata." },
            { title: "Programmazione Settimanale", description: "Visualizza tutte le attività (interventi, appuntamenti, manutenzioni) pianificate nei prossimi 7 giorni, raggruppate per data, per una pianificazione efficiente." },
            { title: "Elenco Interventi", description: "Consulta e gestisci rapidamente gli interventi direttamente dalla dashboard, con filtri e ordinamento per una visione personalizzata." },
            { title: "Promemoria Personale e Aziendale", description: "Usa il blocco note personale per i tuoi appunti e quello aziendale per comunicazioni visibili a tutto il team. Le note vengono salvate automaticamente." },
        ]
    },
    {
        category: "Gestione Operativa",
        icon: Wrench,
        items: [
            { title: "Interventi", description: "Il cuore del sistema. Crea nuove richieste, assegna un operatore, definisci priorità e scadenze. Registra aggiornamenti, materiali, ore di lavoro e allega file. Ogni azione viene tracciata per una cronologia completa." },
            { title: "Nuovi Impianti", description: "Gestisci le installazioni da zero come interventi dedicati. Questo permette di separare la manutenzione ordinaria dai nuovi progetti, con un tracciamento specifico." },
            { title: "Appuntamenti", description: "Pianifica sopralluoghi o incontri preliminari. Geolocalizza l'indirizzo, assegna un operatore e definisci data e ora. Essenziale per organizzare le attività pre-intervento." },
            { title: "Manutenzioni", description: "Imposta interventi ricorrenti (es. controllo annuale caldaia) per non dimenticare nessuna scadenza. Il sistema calcola automaticamente la data successiva al completamento." },
        ]
    },
     {
        category: "Gestione Utenti e Supporto",
        icon: Users,
        items: [
            { title: "Utenti", description: "Crea e gestisci gli account per i tuoi collaboratori (Admin, Operator). Assegna ruoli e, per gli operatori, definisci i settori operativi di competenza (interventi, impianti, ecc.)." },
            { title: "Clienti", description: "Anagrafica completa dei tuoi clienti. Memorizza informazioni di contatto, indirizzi, note riservate e dati di fatturazione per avere tutto a portata di mano." },
            { title: "Supporto", description: "Un sistema di ticketing integrato per gestire le richieste di assistenza dei clienti. Comunica, rispondi e traccia ogni conversazione fino alla risoluzione." },
        ]
    },
    {
        category: "Strumenti e Impostazioni",
        icon: Settings,
        items: [
            { title: "Mappa e Calendario", description: "Ottieni una visione geografica di tutte le attività con la Mappa Operativa o una visione temporale con il Calendario. Filtra per trovare rapidamente ciò che cerchi." },
            { title: "Impostazioni", description: "Personalizza l'applicazione: definisci il profilo della tua azienda, configura l'invio di email, scegli il tema di colori e il font per un'esperienza su misura." },
            { title: "Data Explorer", description: "Uno strumento avanzato per visualizzare e modificare direttamente i dati grezzi della tua azienda. Utile per correzioni rapide o analisi approfondite." },
            { title: "Manuale e Changelog", description: "Consulta questa guida in qualsiasi momento e tieni traccia di tutte le nuove funzionalità e miglioramenti rilasciati nell'applicazione." },
        ]
    }
];

const operatorGuide = [
     {
        category: "Dashboard Personale",
        icon: LayoutDashboard,
        items: [
            { title: "Riepilogo Attività", description: "Visualizza un riepilogo del carico di lavoro totale dell'azienda (Urgenti, Nuovi, In Corso) e un contatore dedicato ai soli interventi assegnati a te." },
            { title: "Programmazione Settimanale", description: "Consulta le tue attività pianificate per i prossimi 7 giorni. Vengono mostrate solo le attività relative ai settori per cui sei abilitato (es. solo manutenzioni)." },
            { title: "I Tuoi Interventi", description: "Accedi rapidamente all'elenco degli interventi che ti sono stati assegnati. La tabella è pre-filtrata per mostrarti solo il tuo lavoro." },
        ]
    },
    {
        category: "Gestione Incarichi",
        icon: Wrench,
        items: [
            { title: "Registrazione Lavoro", description: "Usa i pulsanti 'Avvia Lavoro' e 'Termina Lavoro' all'interno di un intervento per tracciare automaticamente le ore di lavoro e la tua posizione (con il consenso del browser)." },
            { title: "Aggiornamento Intervento", description: "Apri un intervento per aggiungere commenti, registrare i materiali utilizzati, le ore impiegate e allegare foto o documenti direttamente dal campo." },
            { title: "Visione Globale", description: "Navigando dal menu laterale (es. Interventi, Appuntamenti), puoi visualizzare tutte le attività dell'azienda, anche quelle non assegnate a te, per avere un quadro completo." },
        ]
    },
    {
        category: "Strumenti",
        icon: Calendar,
        items: [
            { title: "Calendario e Mappa", description: "Usa il calendario per vedere le scadenze e la mappa per pianificare i tuoi spostamenti. Puoi visualizzare tutte le attività aziendali per una migliore coordinazione." },
            { title: "Profilo", description: "Aggiorna le tue informazioni personali, come nome, avatar e password, accedendo al tuo profilo dal menu utente in alto a destra." },
        ]
    }
];

const clientGuide = [
    {
        category: "La Tua Area Riservata",
        icon: LayoutDashboard,
        items: [
            { title: "Creazione Richieste", description: "Usa il pulsante 'Crea Intervento' per inviare una nuova richiesta di assistenza. Puoi descrivere il problema, allegare file (es. foto del guasto) e inviare tutto con un click." },
            { title: "Elenco Interventi", description: "Visualizza l'elenco completo di tutte le tue richieste, sia quelle in corso che quelle storiche. Puoi vedere lo stato, la data di creazione e i dettagli principali." },
        ]
    },
    {
        category: "Assistenza e Supporto",
        icon: LifeBuoy,
        items: [
            { title: "Supporto Tecnico", description: "Hai bisogno di assistenza amministrativa o hai una domanda non legata a un intervento specifico? Apri un ticket di supporto per comunicare direttamente con l'ufficio." },
            { title: "Conversazioni Tracciate", description: "Ogni ticket ha una sua cronologia di messaggi. Puoi rispondere e leggere le comunicazioni in qualsiasi momento, mantenendo tutto tracciato." },
        ]
    },
    {
        category: "Monitoraggio e Comunicazione",
        icon: Eye,
        items: [
            { title: "Stato in Tempo Reale", description: "Segui l'avanzamento delle tue richieste tramite gli stati (Nuovo, In corso, Completato). Saprai sempre a che punto è il tuo intervento." },
            { title: "Dettaglio Intervento", description: "Clicca su un intervento per aprirne i dettagli. Qui potrai leggere gli aggiornamenti lasciati dal tecnico, vedere i materiali usati e le ore di lavoro." },
            { title: "Notifiche", description: "Riceverai notifiche via email per ogni aggiornamento importante, come la creazione di un intervento o una nuova risposta in un ticket di supporto." },
        ]
    },
     {
        category: "Profilo",
        icon: User,
        items: [
            { title: "Gestisci il Tuo Profilo", description: "Accedi al tuo profilo dal menu in alto a destra per aggiornare le tue informazioni di contatto e modificare la tua password in autonomia." },
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
