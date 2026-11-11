'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { getUsers, getInterventions, getScheduledMaintenance, getAppointments } from '@/lib/data';
import { User, Intervention, ScheduledMaintenance, Appointment } from '@/lib/types';
import {
  Loader,
  MapPin,
  Wrench,
  HardHat,
  ClipboardCheck,
  Navigation,
  ExternalLink,
  Phone,
  Search,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Compass,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isBefore, addDays, startOfToday, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useInterventionModal } from '@/contexts/intervention-modal-context';
import { useRouter } from 'next/navigation';

export interface TerritorialsItem {
  id: string;
  itemType: 'intervention' | 'appointment' | 'client';
  title: string;
  description?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  priority?: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientIsSubscribed?: boolean;
  date?: string;
  rawItem: Intervention | ScheduledMaintenance | Appointment | User;
}

function cleanPhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && !digits.startsWith('39')) {
    return `39${digits}`;
  }
  return digits;
}

export default function MapPage() {
  const { user, currentCompany } = useUser();
  const router = useRouter();
  const { openModal } = useInterventionModal();

  const [allClients, setAllClients] = useState<User[]>([]);
  const [interventions, setInterventions] = useState<(Intervention | ScheduledMaintenance)[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open_activities' | 'appointments' | 'all_clients'>('open_activities');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const clientsMap = useMemo(() => {
    const map = new Map<string, User>();
    allClients.forEach((c) => map.set(c.id, c));
    return map;
  }, [allClients]);

  useEffect(() => {
    async function fetchData() {
      if (!currentCompany || !user) return;
      setLoading(true);
      try {
        const [allUsers, allInterventions, allMaintenance, allAppointments] = await Promise.all([
          getUsers(currentCompany.id),
          getInterventions(currentCompany.id),
          getScheduledMaintenance(currentCompany.id),
          getAppointments(currentCompany.id),
        ]);

        const clientsList = allUsers.filter((u) => u.role === 'Client');
        setAllClients(clientsList);
        const combinedInterventions = [...allInterventions, ...allMaintenance];

        if (user.role === 'Operator') {
          const operatorId = user.id;
          const allowedSectors = user.allowedSectors || [];

          const operatorInterventions = combinedInterventions.filter((i) => {
            if (i.assignedOperatorIds && i.assignedOperatorIds.length > 0 && !i.assignedOperatorIds.includes(operatorId)) return false;
            if (i.isMaintenance) return allowedSectors.includes('maintenance');
            if (i.type === 'new_installation') return allowedSectors.includes('new_installations');
            if (i.type === 'standard') return allowedSectors.includes('interventions');
            return false;
          });

          const operatorAppointments = allAppointments.filter((a) => {
            if (a.assignedOperatorId && a.assignedOperatorId !== operatorId) return false;
            return allowedSectors.includes('appointments');
          });

          setInterventions(operatorInterventions);
          setAppointments(operatorAppointments);
        } else {
          setInterventions(combinedInterventions);
          setAppointments(allAppointments);
        }
      } catch (err) {
        console.error('Failed to load map/territorial activities:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentCompany, user]);

  const itemsToDisplay = useMemo(() => {
    const items: TerritorialsItem[] = [];
    const openStatuses = ['Nuovo', 'In corso', 'In Lavorazione'];
    const now = startOfToday();
    const thirtyDaysAhead = addDays(now, 30);

    if (filter === 'open_activities') {
      interventions.forEach((i) => {
        const client = clientsMap.get(i.clientId);
        let shouldInclude = false;

        if (i.isMaintenance) {
          const m = i as ScheduledMaintenance;
          const dueDate = m.nextDueDate ? new Date(m.nextDueDate) : null;
          if (dueDate && isBefore(dueDate, thirtyDaysAhead) && !['Completato', 'Annullato'].includes(m.status)) {
            shouldInclude = true;
          }
        } else if (i.type === 'new_installation') {
          if (i.status !== 'Completato' && i.status !== 'Annullato') {
            shouldInclude = true;
          }
        } else {
          if (openStatuses.includes(i.status) || (!['Completato', 'Annullato'].includes(i.status))) {
            shouldInclude = true;
          }
        }

        if (shouldInclude) {
          items.push({
            id: `intervention-${i.id}`,
            itemType: 'intervention',
            title: i.title,
            description: i.description || undefined,
            address: client?.address || '',
            latitude: client?.latitude ?? null,
            longitude: client?.longitude ?? null,
            status: i.status,
            priority: i.priority,
            clientId: i.clientId,
            clientName: client?.name || 'Cliente sconosciuto',
            clientPhone: client?.phone || undefined,
            clientEmail: client?.email || undefined,
            clientIsSubscribed: client?.isSubscribed,
            date: i.dueDate || i.createdAt || undefined,
            rawItem: i,
          });
        }
      });
    } else if (filter === 'appointments') {
      appointments.forEach((a) => {
        const client = clientsMap.get(a.clientId);
        if (a.status === 'Pianificato') {
          items.push({
            id: `appointment-${a.id}`,
            itemType: 'appointment',
            title: a.title,
            description: a.notes || undefined,
            address: a.address || client?.address || '',
            latitude: a.latitude ?? client?.latitude ?? null,
            longitude: a.longitude ?? client?.longitude ?? null,
            status: a.status,
            clientId: a.clientId,
            clientName: client?.name || 'Cliente appuntamento',
            clientPhone: client?.phone || undefined,
            clientEmail: client?.email || undefined,
            clientIsSubscribed: client?.isSubscribed,
            date: a.date || undefined,
            rawItem: a,
          });
        }
      });
    } else if (filter === 'all_clients') {
      allClients.forEach((c) => {
        items.push({
          id: `client-${c.id}`,
          itemType: 'client',
          title: c.name,
          description: c.clientNotes || undefined,
          address: c.address || '',
          latitude: c.latitude ?? null,
          longitude: c.longitude ?? null,
          status: c.isSubscribed ? 'Abbonato' : 'Non Abbonato',
          clientId: c.id,
          clientName: c.name,
          clientPhone: c.phone || undefined,
          clientEmail: c.email || undefined,
          clientIsSubscribed: c.isSubscribed,
          rawItem: c,
        });
      });
    }

    return items;
  }, [filter, interventions, appointments, allClients, clientsMap]);

  // Filter with search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return itemsToDisplay;
    const term = searchTerm.toLowerCase();
    return itemsToDisplay.filter((item) => {
      const matchTitle = item.title?.toLowerCase().includes(term);
      const matchClient = item.clientName?.toLowerCase().includes(term);
      const matchAddress = item.address?.toLowerCase().includes(term);
      const matchPhone = item.clientPhone?.includes(term);
      return matchTitle || matchClient || matchAddress || matchPhone;
    });
  }, [itemsToDisplay, searchTerm]);

  // Determine active/selected item
  const selectedItem = useMemo(() => {
    if (selectedItemId) {
      const found = filteredItems.find((i) => i.id === selectedItemId);
      if (found) return found;
    }
    return filteredItems[0] || null;
  }, [selectedItemId, filteredItems]);

  const handleOpenDetails = (item: TerritorialsItem) => {
    if (item.itemType === 'intervention') {
      openModal(item.rawItem as Intervention);
    } else if (item.itemType === 'appointment') {
      router.push('/dashboard/appointments');
    } else if (item.itemType === 'client') {
      router.push('/dashboard/clients');
    }
  };

  const getMapsExternalUrl = (item: TerritorialsItem) => {
    if (item.latitude && item.longitude) {
      return `https://www.google.com/maps?q=${item.latitude},${item.longitude}`;
    }
    if (item.address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`;
    }
    return 'https://www.google.com/maps';
  };

  const getNavigationExternalUrl = (item: TerritorialsItem) => {
    if (item.latitude && item.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
    }
    if (item.address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.address)}`;
    }
    return 'https://www.google.com/maps';
  };

  const coordsCount = useMemo(() => {
    return filteredItems.filter((i) => i.latitude && i.longitude).length;
  }, [filteredItems]);

  if (loading || !user) {
    return (
      <>
        <Header title="Mappa & Attività Territoriali" />
        <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh] gap-3">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Caricamento attività e posizioni...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Mappa & Attività Territoriali" />
      <main className="flex-1 flex flex-col p-4 md:p-6 gap-4 bg-muted/20">
        {/* Top Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per cliente, indirizzo, titolo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Select
              value={filter}
              onValueChange={(val) => {
                setFilter(val as any);
                setSelectedItemId(null);
              }}
            >
              <SelectTrigger className="w-full sm:w-[240px] bg-background">
                <SelectValue placeholder="Filtra elementi..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open_activities">Attività Aperte (Interventi/Manut.)</SelectItem>
                <SelectItem value="appointments">Appuntamenti Pianificati</SelectItem>
                <SelectItem value="all_clients">Tutti i Clienti con Posizione</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto text-xs">
            <Badge variant="outline" className="bg-background">
              Totale: <strong className="ml-1">{filteredItems.length}</strong>
            </Badge>
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
              <MapPin className="h-3 w-3 mr-1" /> GPS Attivo: {coordsCount}
            </Badge>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Interactive Cards List */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="text-xs font-medium text-muted-foreground px-1 flex items-center justify-between">
              <span>Seleziona un elemento per dettagli e navigazione:</span>
              <span>{filteredItems.length} risultati</span>
            </div>

            <ScrollArea className="h-[calc(100vh-16rem)] min-h-[400px] pr-2">
              <div className="space-y-2.5">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-12 px-4 border rounded-xl bg-card text-muted-foreground">
                    <MapPin className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium text-sm">Nessuna attività o posizione trovata.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchTerm ? 'Prova a modificare la ricerca.' : 'Non ci sono elementi per il filtro selezionato.'}
                    </p>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const hasCoords = item.latitude && item.longitude;
                    const mapsUrl = getMapsExternalUrl(item);
                    const navUrl = getNavigationExternalUrl(item);
                    const waPhone = cleanPhoneForWhatsApp(item.clientPhone);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-card hover:border-primary/50 hover:shadow-sm ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 shadow-md bg-accent/10'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.itemType === 'intervention' && (
                              (item.rawItem as Intervention).type === 'new_installation' ? (
                                <div className="p-1.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                  <HardHat className="h-4 w-4" />
                                </div>
                              ) : (
                                <div className="p-1.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                  <Wrench className="h-4 w-4" />
                                </div>
                              )
                            )}
                            {item.itemType === 'appointment' && (
                              <div className="p-1.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                <ClipboardCheck className="h-4 w-4" />
                              </div>
                            )}
                            {item.itemType === 'client' && (
                              <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                <Building className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate uppercase">{item.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.clientName}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-1">
                            {item.status && (
                              <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                {item.status}
                              </Badge>
                            )}
                            {item.priority && (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${
                                  item.priority === 'Urgente'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {item.priority}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {item.address ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2 line-clamp-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                            <span>{item.address}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600 dark:text-amber-400 italic mb-2">
                            Nessun indirizzo registrato
                          </p>
                        )}

                        {/* Coords & Quick External Links */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t mt-2">
                          <div>
                            {hasCoords ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                <Compass className="h-3 w-3" />
                                {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Solo indirizzo testo</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs font-medium border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                            >
                              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Maps
                              </a>
                            </Button>

                            <Button
                              asChild
                              size="sm"
                              className="h-7 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <a href={navUrl} target="_blank" rel="noopener noreferrer">
                                <Navigation className="h-3 w-3 mr-1" />
                                Naviga
                              </a>
                            </Button>

                            {item.clientPhone && (
                              <Button asChild size="icon" variant="ghost" className="h-7 w-7">
                                <a href={`tel:${item.clientPhone}`} title={`Chiama ${item.clientPhone}`}>
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Column: Direct External Actions & Map Preview */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {selectedItem ? (
              <Card className="shadow-sm border overflow-hidden">
                <CardHeader className="bg-card border-b p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className="text-xs uppercase font-semibold bg-primary/10 text-primary"
                        >
                          {selectedItem.itemType === 'intervention'
                            ? 'Intervento'
                            : selectedItem.itemType === 'appointment'
                            ? 'Appuntamento'
                            : 'Cliente'}
                        </Badge>
                        {selectedItem.clientIsSubscribed !== undefined && (
                          <Badge
                            className={
                              selectedItem.clientIsSubscribed
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }
                          >
                            {selectedItem.clientIsSubscribed ? 'Assistenza Attiva' : 'Non Abbonato'}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg sm:text-xl font-bold truncate">
                        {selectedItem.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-foreground/80 font-medium">
                        Cliente: {selectedItem.clientName}
                      </CardDescription>
                    </div>

                    {/* Direct Launch Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        asChild
                        size="default"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
                      >
                        <a
                          href={getMapsExternalUrl(selectedItem)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Apri su Google Maps
                        </a>
                      </Button>

                      <Button
                        asChild
                        size="default"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10 font-semibold"
                      >
                        <a
                          href={getNavigationExternalUrl(selectedItem)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="mr-2 h-4 w-4" />
                          Avvia Navigatore
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Details strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 mt-3 border-t text-xs">
                    <div>
                      <span className="text-muted-foreground">Indirizzo:</span>{' '}
                      <strong className="text-foreground">{selectedItem.address || 'Non specificato'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coordinate GPS:</span>{' '}
                      {selectedItem.latitude && selectedItem.longitude ? (
                        <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                          {selectedItem.latitude.toFixed(6)}, {selectedItem.longitude.toFixed(6)}
                        </strong>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 italic">Non registrate</span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Zero-API Interactive Google Maps iframe embed */}
                  <div className="relative rounded-xl overflow-hidden border shadow-inner bg-muted/40 aspect-[16/10] sm:h-[420px] w-full">
                    {selectedItem.latitude && selectedItem.longitude ? (
                      <iframe
                        key={`${selectedItem.latitude}-${selectedItem.longitude}`}
                        title="Anteprima Posizione Google Maps"
                        className="w-full h-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${selectedItem.latitude},${selectedItem.longitude}&hl=it&z=15&output=embed`}
                      />
                    ) : selectedItem.address ? (
                      <iframe
                        key={selectedItem.address}
                        title="Anteprima Indirizzo Google Maps"
                        className="w-full h-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedItem.address)}&hl=it&z=15&output=embed`}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                        <MapPin className="h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="font-medium text-sm">Nessuna coordinata né indirizzo per questo elemento.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Modifica il cliente o l&apos;attività per registrare la posizione GPS o l&apos;indirizzo.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions & Description */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-muted-foreground">
                      {selectedItem.description && (
                        <p className="line-clamp-2 italic">{selectedItem.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenDetails(selectedItem)}
                      >
                        Visualizza Scheda Completa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] border rounded-xl bg-card text-muted-foreground p-8 text-center shadow-sm">
                <MapPin className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <h3 className="text-base font-semibold text-foreground">Nessun elemento selezionato</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Seleziona una delle attività aperte o dei clienti a sinistra per aprire la posizione su Google Maps o avviare la navigazione GPS.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
