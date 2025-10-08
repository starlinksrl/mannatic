
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { getUsers, getInterventions, getScheduledMaintenance } from '@/lib/data';
import { User, Intervention, ScheduledMaintenance } from '@/lib/types';
import { Loader, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMaps } from '@/contexts/maps-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isBefore, addDays, startOfToday, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useInterventionModal } from '@/contexts/intervention-modal-context';

const mapContainerStyle = {
  width: '100%',
  height: '60vh',
};

const defaultCenter = {
  lat: 41.8719,
  lng: 12.5674,
};

type ClientWithLocation = User;

export default function MapPage() {
  const { isLoaded, loadError } = useMaps();
  const { currentCompany } = useUser();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [allClients, setAllClients] = useState<ClientWithLocation[]>([]);
  const [interventions, setInterventions] = useState<(Intervention | ScheduledMaintenance)[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientWithLocation | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const { openModal } = useInterventionModal();

  useEffect(() => {
    async function fetchData() {
      if (!currentCompany || !isLoaded) return;
      setLoading(true);

      const [allUsers, allInterventions, allMaintenance] = await Promise.all([
        getUsers(currentCompany.id),
        getInterventions(currentCompany.id),
        getScheduledMaintenance(currentCompany.id),
      ]);
      
      const clientsWithCoords = allUsers.filter(u => u.role === 'Client');
      
      setAllClients(clientsWithCoords);
      setInterventions([...allInterventions, ...allMaintenance]);
      setLoading(false);
    }
    fetchData();
  }, [currentCompany, isLoaded]);

  const clientsWithNewInstallation = useMemo(() => {
    const clientIds = new Set(
      interventions
        .filter(i => i.type === 'new_installation' && i.status !== 'Completato' && i.status !== 'Annullato')
        .map(i => i.clientId)
    );
    return clientIds;
  }, [interventions]);

  const clientsToDisplay = useMemo(() => {
    if (filter === 'all') {
      return allClients.filter(client => client.latitude && client.longitude);
    }

    const openInterventionStatuses = ['Nuovo', 'In corso', 'In attesa'];
    const now = startOfToday();
    const thirtyDaysFromNow = addDays(now, 30);
    
    const clientIdsWithOpenWork = new Set(
      interventions
        .filter(i => {
            if (i.isMaintenance === false && i.type === 'standard' && openInterventionStatuses.includes(i.status)) {
                return true;
            }
            if (i.type === 'new_installation' && i.status !== 'Completato' && i.status !== 'Annullato') {
                return true;
            }
            if (i.isMaintenance) {
                const maintenanceTask = i as ScheduledMaintenance;
                const nextDueDate = new Date(maintenanceTask.nextDueDate);
                return isBefore(nextDueDate, thirtyDaysFromNow) && !['Completato', 'Annullato'].includes(maintenanceTask.status);
            }
            return false;
        })
        .map(i => i.clientId)
    );
    
    return allClients.filter(client => client.latitude && client.longitude && clientIdsWithOpenWork.has(client.id));
  }, [filter, allClients, interventions]);
  
  const selectedClientInterventions = useMemo(() => {
    if (!selectedClient) return [];
    return interventions.filter(i => i.clientId === selectedClient.id && i.status !== 'Completato' && i.status !== 'Annullato');
  }, [selectedClient, interventions]);


  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);
  
  useEffect(() => {
    if (map && clientsToDisplay.length > 0 && !selectedClient) {
      const bounds = new window.google.maps.LatLngBounds();
      clientsToDisplay.forEach(client => {
        if(client.latitude && client.longitude) {
           bounds.extend(new window.google.maps.LatLng(client.latitude, client.longitude));
        }
      });
      if (clientsToDisplay.length > 1) {
        map.fitBounds(bounds);
      } else if (clientsToDisplay.length === 1 && clientsToDisplay[0].latitude && clientsToDisplay[0].longitude) {
        map.setCenter({ lat: clientsToDisplay[0].latitude, lng: clientsToDisplay[0].longitude });
        map.setZoom(14);
      }
    } else if (map && selectedClient) {
        map.panTo({ lat: selectedClient.latitude!, lng: selectedClient.longitude! });
        map.setZoom(15);
    }
  }, [map, clientsToDisplay, selectedClient]);
  
  const handleMarkerClick = (client: ClientWithLocation) => {
    setSelectedClient(client);
  };
  
  const handleOpenInterventionModal = (intervention: Intervention | ScheduledMaintenance) => {
    openModal(intervention as Intervention);
  }


  if (loadError) {
    console.error("Map Load Error:", loadError)
    return <div>Error loading maps. Check console for details.</div>;
  }
  if (!isLoaded || loading) {
    return (
        <>
            <Header title="Mappa Clienti" />
            <div className="flex items-center justify-center flex-1">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        </>
    )
  }

  return (
    <>
      <Header title="Mappa Clienti" />
      <main className="flex-1 flex flex-col">
        <div className="p-4 bg-card border-b">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select value={filter} onValueChange={(value) => {
                    setFilter(value as 'open' | 'all');
                    setSelectedClient(null);
                }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filtra clienti..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="open">Clienti con interventi aperti</SelectItem>
                        <SelectItem value="all">Tutti i clienti con coordinate</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="lg:col-span-2 relative h-full min-h-[50vh] lg:min-h-0">
            <GoogleMap 
              mapContainerStyle={{width: '100%', height: '100%'}} 
              center={defaultCenter}
              zoom={6}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            >
              {clientsToDisplay.map(client => {
                const isNewInstallation = clientsWithNewInstallation.has(client.id);
                const markerIcon = isNewInstallation ? {
                    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeWeight: 0,
                    anchor: new google.maps.Point(12, 24),
                    scale: 1.5,
                } : undefined;

                return (
                  client.latitude && client.longitude &&
                  <MarkerF
                    key={client.id}
                    position={{ lat: client.latitude, lng: client.longitude }}
                    onClick={() => handleMarkerClick(client)}
                    icon={markerIcon}
                  />
                )
              })}
            </GoogleMap>
          </div>
          <div className="lg:col-span-1 bg-background border-l">
            <ScrollArea className="h-full max-h-[calc(100vh-10rem)]">
               {selectedClient ? (
                    <div className="p-4">
                        <Card>
                             <CardHeader>
                                <CardTitle>{selectedClient.name}</CardTitle>
                                <CardDescription>{selectedClient.address}</CardDescription>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedClient.latitude},${selectedClient.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button variant="outline" size="sm" className="mt-2">
                                        <MapPin className="mr-2 h-4 w-4" />
                                        Ottieni Indicazioni
                                    </Button>
                                </a>
                            </CardHeader>
                            <CardContent>
                                <h4 className="font-semibold mb-2">Interventi Attivi</h4>
                                {selectedClientInterventions.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedClientInterventions.map(i => (
                                            <div key={i.id} onClick={() => handleOpenInterventionModal(i)} className="p-2 border rounded-md cursor-pointer hover:bg-muted">
                                                <p className="font-semibold text-sm">{i.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Stato: {i.status} - Scadenza: {i.dueDate ? format(new Date(i.dueDate), 'dd/MM/yy HH:mm', { locale: it }) : 'N/D'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Nessun intervento attivo per questo cliente.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
               ) : (
                 <div className="p-4 text-center text-muted-foreground h-full flex items-center justify-center">
                    <p>Seleziona un cliente sulla mappa per vedere i dettagli.</p>
                </div>
               )}
            </ScrollArea>
          </div>
        </div>
      </main>
    </>
  );
}
