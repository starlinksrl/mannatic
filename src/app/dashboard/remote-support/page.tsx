'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Monitor,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Server,
  Key,
  Smartphone,
  Laptop,
  Apple,
  Share2,
  Play,
  RotateCw,
  Send,
  MessageCircle,
  Users,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { getClients } from '@/lib/data';
import { User } from '@/lib/types';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';
import { createWhatsAppLink } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RUSTDESK_SERVER_HOST = 'remote.mannatec.it';
const RUSTDESK_RELAY_HOST = 'remote.mannatec.it:21117';
const RUSTDESK_PUBLIC_KEY = 'xprpBdDVPKwXQd0HBInvLO38hvcT9mkVpBWVFckYkHM=';

export default function RemoteSupportPage() {
  const { user, currentCompany } = useUser();
  const { toast } = useToast();

  const [remoteId, setRemoteId] = useState('');
  const [remotePassword, setRemotePassword] = useState('');
  const [clients, setClients] = useState<User[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadClients() {
      if (!currentCompany) return;
      try {
        const c = await getClients(currentCompany.id);
        setClients(c);
      } catch (e) {
        console.error('Error fetching clients:', e);
      }
    }
    loadClients();
  }, [currentCompany]);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      // Se il cliente ha un ID salvato
      if ((client as any).rustdeskId) {
        setRemoteId((client as any).rustdeskId);
      }
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const cleanId = (id: string) => id.replace(/\s+/g, '');

  const handleCopy = (text: string, label: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast({
      title: 'Copiato!',
      description: `${label} copiato negli appunti.`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLaunchNativeApp = () => {
    const rawId = cleanId(remoteId);
    if (!rawId) {
      toast({
        variant: 'destructive',
        title: 'ID mancante',
        description: 'Inserisci l\'ID RustDesk del cliente per avviare la sessione.',
      });
      return;
    }
    const params = new URLSearchParams();
    if (remotePassword.trim()) {
      params.set('password', remotePassword.trim());
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const protocolUrl = `rustdesk://${rawId}${queryString}`;
    window.location.href = protocolUrl;
  };

  const getClientInstructionsText = () => {
    const downloadUrl = `https://supporto.mannatec.it/api/rustdesk/download?os=windows`;
    return `Gentile cliente,
per avviare la sessione di teleassistenza con il nostro supporto tecnico MannaTec:

1. Scarica ed esegui il programma (senza installazione) da questo link:
${downloadUrl}

2. All'avvio del programma, comunicaci il tuo ID di 9 cifre e la password temporanea che visualizzi a schermo.

Server di supporto: ${RUSTDESK_SERVER_HOST}`;
  };

  const handleCopyInstructions = () => {
    handleCopy(getClientInstructionsText(), 'Istruzioni cliente');
  };

  const handleSendWhatsAppInstructions = () => {
    const text = getClientInstructionsText();
    const phone = selectedClient?.phone || '';
    if (phone) {
      window.open(createWhatsAppLink(phone, text), '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  if (user?.role === 'Client') {
    return (
      <>
        <Header title="Teleassistenza Remota" />
        <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
          {/* Hero Banner Cliente */}
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 md:p-8 text-white shadow-lg">
            <div className="max-w-2xl space-y-3">
              <Badge className="bg-white/20 hover:bg-white/20 text-white text-xs border-0 backdrop-blur-xs">
                Assistenza Tecnica Diretta
              </Badge>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Modulo di Teleassistenza Remota
              </h2>
              <p className="text-sm md:text-base text-blue-100 leading-relaxed">
                Scarica ed avvia il nostro modulo di supporto. Non richiede installazione: consentirà al nostro personale tecnico autorizzato di collegarsi al tuo computer per risolvere rapidamente qualsiasi problema.
              </p>
              <div className="pt-3 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-md">
                  <a href="/api/rustdesk/download?os=windows" download>
                    <Download className="mr-2 h-5 w-5" />
                    Scarica per Windows (.exe)
                  </a>
                </Button>
                <Button variant="outline" asChild size="lg" className="bg-white/10 hover:bg-white/20 text-white border-white/30">
                  <a href="/dashboard/requests">
                    Torna alle mie richieste
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* 3 Step Card */}
          <Card className="border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Come Funziona la Teleassistenza (3 Semplici Passaggi)
              </CardTitle>
              <CardDescription>
                Procedura veloce e sicura con connessione cifrata end-to-end sul nostro server dedicato.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border bg-muted/40 space-y-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h4 className="font-semibold text-sm">Scarica ed Esegui</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Clicca sul pulsante di download e avvia il file scaricato. Non è richiesta alcuna installazione sul sistema.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/40 space-y-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <h4 className="font-semibold text-sm">Comunica ID e Password</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A video vedrai il tuo ID numerico e una Password temporanea monouso. Inviali al tecnico nel ticket o via WhatsApp.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/40 space-y-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <h4 className="font-semibold text-sm">Assistenza Immediata</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Il tecnico si collegherà e risolverà l'anomalia. Quando chiudi il programma, la connessione viene chiusa definitivamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Altri Sistemi Operativi */}
          <Card className="border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Laptop className="h-4 w-4 text-muted-foreground" />
                Altri Sistemi Operativi
              </CardTitle>
              <CardDescription>
                Se utilizzi un Mac, uno smartphone o un tablet, puoi scaricare il client dedicato:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button variant="outline" asChild className="justify-start gap-2 h-auto py-2.5">
                  <a href="/api/rustdesk/download?os=mac" target="_blank" rel="noopener noreferrer">
                    <Apple className="h-4 w-4 shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">macOS (Apple / Intel)</div>
                      <div className="text-[10px] text-muted-foreground">Download .dmg</div>
                    </div>
                  </a>
                </Button>

                <Button variant="outline" asChild className="justify-start gap-2 h-auto py-2.5">
                  <a href="/api/rustdesk/download?os=android" target="_blank" rel="noopener noreferrer">
                    <Smartphone className="h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Android</div>
                      <div className="text-[10px] text-muted-foreground">Download .apk</div>
                    </div>
                  </a>
                </Button>

                <Button variant="outline" asChild className="justify-start gap-2 h-auto py-2.5">
                  <a href="/api/rustdesk/download?os=ios" target="_blank" rel="noopener noreferrer">
                    <Apple className="h-4 w-4 shrink-0 text-blue-500" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">iPhone / iPad</div>
                      <div className="text-[10px] text-muted-foreground">App Store</div>
                    </div>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Teleassistenza Remota" />
      <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        
        {/* Banner Server Privato MannaTec */}
        <div className="rounded-xl border bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-5 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <h2 className="text-lg md:text-xl font-bold tracking-tight">
                  Server Privato Teleassistenza MannaTec
                </h2>
                <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white text-xs border-0 ml-1">
                  Server Attivo & Cifrato
                </Badge>
              </div>
              <p className="text-sm text-blue-100 max-w-3xl leading-relaxed">
                Tutte le sessioni remote viaggiano direttamente attraverso il tuo server Ubuntu dedicato (<strong>{RUSTDESK_SERVER_HOST}</strong>) con crittografia end-to-end Ed25519 e zero intermediari terzi.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyInstructions}
                className="gap-1.5 text-xs font-semibold shadow-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                Copia Invito Cliente
              </Button>
            </div>
          </div>
        </div>

        {/* Griglia Principale: Connessione Rapida & Download Cliente */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Colonna Sinistra: Connessione Rapida al Cliente (7 col) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  Connetti a PC Cliente
                </CardTitle>
                <CardDescription>
                  Inserisci l'ID fornito dal cliente per prendere il controllo remoto del suo computer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Selezione Rapida Cliente */}
                {clients.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Seleziona Cliente (opzionale)
                    </Label>
                    <Select value={selectedClientId} onValueChange={handleSelectClient}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Seleziona un cliente per autocompilare..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} {c.phone ? `(${c.phone})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* ID e Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rustdesk-id" className="text-xs font-semibold">
                      ID RustDesk Cliente <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="rustdesk-id"
                      placeholder="es. 958 123 456"
                      value={remoteId}
                      onChange={(e) => setRemoteId(e.target.value)}
                      className="font-mono text-base tracking-wider"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rustdesk-pwd" className="text-xs font-semibold">
                      Password Temporanea (se richiesta)
                    </Label>
                    <Input
                      id="rustdesk-pwd"
                      type="text"
                      placeholder="Password monouso"
                      value={remotePassword}
                      onChange={(e) => setRemotePassword(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Azioni di Connessione */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <Button
                    onClick={handleLaunchNativeApp}
                    disabled={!cleanId(remoteId)}
                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 shadow-sm"
                  >
                    <Play className="h-4 w-4" />
                    Avvia Sessione RustDesk
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-10"
                  >
                    <a href="/api/rustdesk/download?os=windows" download>
                      <Download className="h-4 w-4 text-emerald-600 shrink-0" />
                      Scarica Client Tecnico
                    </a>
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                  <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                  Cliccando su <strong>Avvia Sessione RustDesk</strong> si aprirà direttamente il controllo remoto sul tuo computer tramite il server privato <strong>{RUSTDESK_SERVER_HOST}</strong>.
                </p>
              </CardContent>
            </Card>

            {/* Dettagli Configurazione Server Privato */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Server className="h-5 w-5 text-indigo-500" />
                  Parametri Server MannaTec
                </CardTitle>
                <CardDescription>
                  Parametri da inserire nelle impostazioni di RustDesk su dispositivi già esistenti.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border bg-muted/40 space-y-1">
                    <span className="text-muted-foreground font-medium block">Server ID / Rendezvous:</span>
                    <div className="flex items-center justify-between gap-1 font-mono font-semibold">
                      <span className="truncate">{RUSTDESK_SERVER_HOST}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopy(RUSTDESK_SERVER_HOST, 'Server ID')}
                      >
                        {copiedKey === 'Server ID' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-muted/40 space-y-1">
                    <span className="text-muted-foreground font-medium block">Server Relay:</span>
                    <div className="flex items-center justify-between gap-1 font-mono font-semibold">
                      <span className="truncate">{RUSTDESK_SERVER_HOST}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopy(RUSTDESK_SERVER_HOST, 'Server Relay')}
                      >
                        {copiedKey === 'Server Relay' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border bg-muted/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Key className="h-3 w-3 text-amber-500" /> Chiave Pubblica Server (Public Key):
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => handleCopy(RUSTDESK_PUBLIC_KEY, 'Chiave Pubblica')}
                    >
                      {copiedKey === 'Chiave Pubblica' ? <Check className="h-3 w-3 text-green-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Copia Chiave
                    </Button>
                  </div>
                  <p className="font-mono text-xs break-all bg-card p-1.5 rounded border select-all">
                    {RUSTDESK_PUBLIC_KEY}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonna Destra: Download e Invito al Cliente (5 col) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Download className="h-5 w-5 text-emerald-500" />
                  Download per il Cliente
                </CardTitle>
                <CardDescription>
                  Fai scaricare al cliente il client leggero senza bisogno di installazione.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Windows Preconfigurato Highlight */}
                <div className="rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Laptop className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-sm">Windows (Preconfigurato)</span>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[10px]">
                      Nessuna Configurazione
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Il file eseguibile include già l'indirizzo del tuo server <strong>{RUSTDESK_SERVER_HOST}</strong> e la chiave di cifratura. Il cliente deve solo fare doppio clic ed eseguire.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                  >
                    <a href="/api/rustdesk/download?os=windows" download>
                      <Download className="h-3.5 w-3.5" />
                      Scarica Eseguibile Windows (.exe)
                    </a>
                  </Button>
                </div>

                {/* Altri Sistemi Operativi */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Altri Sistemi Operativi:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex flex-col h-auto py-2 px-1 text-center hover:border-primary"
                    >
                      <a href="/api/rustdesk/download?os=mac" target="_blank" rel="noopener noreferrer">
                        <Apple className="h-4 w-4 mb-1" />
                        <span className="text-[11px] font-medium">Mac (.dmg)</span>
                      </a>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex flex-col h-auto py-2 px-1 text-center hover:border-primary"
                    >
                      <a href="/api/rustdesk/download?os=android" target="_blank" rel="noopener noreferrer">
                        <Smartphone className="h-4 w-4 mb-1 text-emerald-500" />
                        <span className="text-[11px] font-medium">Android</span>
                      </a>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex flex-col h-auto py-2 px-1 text-center hover:border-primary"
                    >
                      <a href="/api/rustdesk/download?os=ios" target="_blank" rel="noopener noreferrer">
                        <Smartphone className="h-4 w-4 mb-1 text-blue-500" />
                        <span className="text-[11px] font-medium">iOS / iPad</span>
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Condivisione Rapida */}
                <div className="pt-2 border-t space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Invia istruzioni di collegamento:
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendWhatsAppInstructions}
                      className="flex-1 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      <WhatsAppIcon className="h-4 w-4 shrink-0" />
                      Invia su WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyInstructions}
                      className="flex-1 gap-1.5 text-xs"
                    >
                      <Copy className="h-3.5 w-3.5 shrink-0" />
                      Copia Testo
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

        </div>

        {/* Guida Operativa & Configurazione Tecnico */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Laptop className="h-5 w-5 text-blue-600" />
              Come effettuare l'assistenza al cliente (Guida Tecnico)
            </CardTitle>
            <CardDescription>
              La connessione desktop ad alte prestazioni (60 FPS, tastiera, clipboard, doppio monitor) avviene tramite l'applicazione RustDesk collegata al tuo server privato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-xs">
                    Passo 1
                  </Badge>
                  <span className="font-semibold text-sm">Avvia RustDesk sul tuo PC</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Se sei su Windows, puoi usare direttamente lo stesso file preconfigurato: scaricalo con il pulsante <strong>"Scarica Client Tecnico"</strong> ed eseguilo. Sarà già collegato al tuo server MannaTec con il pallino verde <strong>"Pronto"</strong> in basso.
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-xs">
                    Passo 2
                  </Badge>
                  <span className="font-semibold text-sm">Inserisci l'ID del Cliente</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fatti comunicare l'ID di 9 cifre dal cliente (es. <code className="bg-muted px-1 py-0.5 rounded">381 824 655</code>) e inseriscilo nel riquadro in alto <em>"Connetti a PC Cliente"</em>. Se il cliente ha fornito una password monouso, inserisci anche quella.
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-xs">
                    Passo 3
                  </Badge>
                  <span className="font-semibold text-sm">Premi "Avvia Sessione"</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Clicca su <strong>"Avvia Sessione RustDesk"</strong>. Il browser invierà il comando direttamente al programma sul tuo computer e si aprirà la finestra di controllo remoto del cliente in tempo reale.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <strong>Perché il controllo remoto richiede l'applicazione RustDesk e non un semplice iframe web?</strong>
                <p className="mt-0.5 text-muted-foreground dark:text-amber-300/80 leading-relaxed">
                  I browser web impongono stringenti restrizioni di sicurezza (blocco tasti di sistema come Ctrl+Alt+Canc, gestione limitata del mouse e blocco delle connessioni video non criptate). L'applicazione desktop RustDesk si collega via UDP/TCP a bassissima latenza direttamente al tuo server privato <strong>remote.mannatec.it</strong>, garantendo fluidità a 60 FPS e il controllo totale della macchina remota.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </main>
    </>
  );
}
