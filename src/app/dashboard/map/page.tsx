

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { getUsers, getInterventions, getScheduledMaintenance, getAppointments } from '@/lib/data';
import { User, Intervention, ScheduledMaintenance, Appointment } from '@/lib/types';
import { Loader, MapPin, Wrench, HardHat, ClipboardCheck, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMaps } from '@/contexts/maps-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isBefore, addDays, startOfToday, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useInterventionModal } from '@/contexts/intervention-modal-context';
import { useRouter } from 'next/navigation';

const mapContainerStyle = {
  width: '100%',
  height: '60vh',
};

const defaultCenter = {
  lat: 41.8719,
  lng: 12.5674,
};

type MapItem = (Intervention | ScheduledMaintenance | Appointment | User) & {
    itemType: 'intervention' | 'appointment' | 'client';
    latitude: number;
    longitude: number;
    clientId: string;
};


export default function MapPage() {
  const { isLoaded, loadError } = useMaps();
  const { user, currentCompany } = useUser();
  const router = useRouter();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [allClients, setAllClients] = useState<User[]>([]);
  const [interventions, setInterventions] = useState<(Intervention | ScheduledMaintenance)[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);
  const [filter, setFilter] = useState<'open_activities' | 'appointments' | 'all_clients'>('open_activities');
  const { openModal } = useInterventionModal();

  const clientsMap = useMemo(() => {
    const map = new Map<string, User>();
    allClients.forEach(client => map.set(client.id, client));
    return map;
  }, [allClients]);

  useEffect(() => {
    async function fetchData() {
      if (!currentCompany || !isLoaded || !user) return;
      setLoading(true);

      const [allUsers, allInterventions, allMaintenance, allAppointments] = await Promise.all([
        getUsers(currentCompany.id),
        getInterventions(currentCompany.id),
        getScheduledMaintenance(currentCompany.id),
        getAppointments(currentCompany.id),
      ]);
      
      const clientsWithCoords = allUsers.filter(u => u.role === 'Client');
      
      setAllClients(clientsWithCoords);
      const combinedInterventions = [...allInterventions, ...allMaintenance];

      if (user.role === 'Operator') {
        const operatorId = user.id;
        const allowedSectors = user.allowedSectors || [];

        const operatorInterventions = combinedInterventions.filter(i => {
            if (i.assignedOperatorId !== operatorId && i.assignedOperatorId) return false;
            if (i.isMaintenance) return allowedSectors.includes('maintenance');
            if (i.type === 'new_installation') return allowedSectors.includes('new_installations');
            if (i.type === 'standard') return allowedSectors.includes('interventions');
            return false;
        });

        const operatorAppointments = allAppointments.filter(a => {
            if (a.assignedOperatorId !== operatorId && a.assignedOperatorId) return false;
            return allowedSectors.includes('surveys');
        });
        
        setInterventions(operatorInterventions);
        setAppointments(operatorAppointments);

      } else { // Admin or Creator
        setInterventions(combinedInterventions);
        setAppointments(allAppointments);
      }
      
      setLoading(false);
    }
    fetchData();
  }, [currentCompany, isLoaded, user]);

  
  const itemsToDisplay = useMemo(() => {
    const mapItems: MapItem[] = [];
    const openInterventionStatuses = ['Nuovo', 'In corso'];
    const now = startOfToday();
    const thirtyDaysFromNow = addDays(now, 30);

    if (filter === 'open_activities') {
        interventions.forEach(i => {
            const client = clientsMap.get(i.clientId);
            if (!client || !client.latitude || !client.longitude) return;

            let shouldInclude = false;
            if (i.isMaintenance === false && i.type === 'standard' && openInterventionStatuses.includes(i.status)) {
                shouldInclude = true;
            }
            if (i.type === 'new_installation' && i.status !== 'Completato' && i.status !== 'Annullato') {
                shouldInclude = true;
            }
            if (i.isMaintenance) {
                const maintenanceTask = i as ScheduledMaintenance;
                const nextDueDate = new Date(maintenanceTask.nextDueDate);
                if(isBefore(nextDueDate, thirtyDaysFromNow) && !['Completato', 'Annullato'].includes(maintenanceTask.status)) {
                    shouldInclude = true;
                }
            }
            
            if (shouldInclude) {
                mapItems.push({ ...i, itemType: 'intervention', latitude: client.latitude, longitude: client.longitude });
            }
        });
    } else if (filter === 'appointments') {
        appointments.forEach(s => {
            if (!s.latitude || !s.longitude) return;

            if (s.status === 'Pianificato') {
                 mapItems.push({ ...s, itemType: 'appointment', latitude: s.latitude, longitude: s.longitude });
            }
        });
    } else if (filter === 'all_clients') {
        allClients.forEach(c => {
             if (c.latitude && c.longitude) {
                mapItems.push({ ...c, itemType: 'client', latitude: c.latitude, longitude: c.longitude, clientId: c.id });
            }
        });
    }
    
    return mapItems;
  }, [filter, interventions, appointments, allClients, clientsMap]);
  
  const selectedItemInterventions = useMemo(() => {
    if (!selectedItem) return [];
    return interventions.filter(i => i.clientId === selectedItem.clientId && i.status !== 'Completato' && i.status !== 'Annullato');
  }, [selectedItem, interventions]);


  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);
  
  useEffect(() => {
    if (map && itemsToDisplay.length > 0 && !selectedItem) {
      const bounds = new window.google.maps.LatLngBounds();
      itemsToDisplay.forEach(item => {
        if(item.latitude && item.longitude) {
           bounds.extend(new window.google.maps.LatLng(item.latitude, item.longitude));
        }
      });
      if (itemsToDisplay.length > 1) {
        map.fitBounds(bounds);
      } else if (itemsToDisplay.length === 1 && itemsToDisplay[0].latitude && itemsToDisplay[0].longitude) {
        map.setCenter({ lat: itemsToDisplay[0].latitude, lng: itemsToDisplay[0].longitude });
        map.setZoom(14);
      }
    } else if (map && selectedItem) {
        map.panTo({ lat: selectedItem.latitude!, lng: selectedItem.longitude! });
        map.setZoom(15);
    }
  }, [map, itemsToDisplay, selectedItem]);
  
  const handleMarkerClick = (item: MapItem) => {
    setSelectedItem(item);
  };
  
  const handleOpenInterventionModal = (intervention: Intervention | ScheduledMaintenance) => {
    openModal(intervention as Intervention);
  }


  if (loadError) {
    console.error("Map Load Error:", loadError)
    return <div>Error loading maps. Check console for details.</div>;
  }
  if (!isLoaded || loading || !user) {
    return (
        <>
            <Header title="Mappa Operativa" />
            <div className="flex items-center justify-center flex-1">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        </>
    )
  }

  const getMarkerIcon = (item: MapItem) => {
    if (item.itemType === 'appointment') {
        return {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: '#8B5CF6', // purple-500
            fillOpacity: 1,
            strokeWeight: 0,
            anchor: new google.maps.Point(12, 24),
            scale: 1.5,
        };
    }
    
    if (item.itemType === 'intervention') {
        const isNewInstallation = (item as Intervention).type === 'new_installation';
        return {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: isNewInstallation ? '#4285F4' : '#f44336', // blue for new install, red for standard
            fillOpacity: 1,
            strokeWeight: 0,
            anchor: new google.maps.Point(12, 24),
            scale: 1.5,
        };
    }

    if (item.itemType === 'client') {
       return {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: '#888',
            fillOpacity: 0.8,
            strokeWeight: 0,
            anchor: new google.maps.Point(12, 24),
            scale: 1,
        };
    }
  }

  const selectedClient = selectedItem ? clientsMap.get(selectedItem.clientId) : null;


  return (
    <>
      <Header title="Mappa Operativa" />
      <main className="flex-1 flex flex-col">
        <div className="p-4 bg-card border-b">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select value={filter} onValueChange={(value) => {
                    setFilter(value as 'open_activities' | 'appointments' | 'all_clients');
                    setSelectedItem(null);
                }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filtra elementi..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="open_activities">Attività aperte</SelectItem>
                        <SelectItem value="appointments">Appuntamenti pianificati</SelectItem>
                        {user.role === 'Admin' && <SelectItem value="all_clients">Tutti i clienti</SelectItem>}
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
              {itemsToDisplay.map(item => {
                return (
                  item.latitude && item.longitude &&
                  <MarkerF
                    key={item.itemType + '-' + item.id}
                    position={{ lat: item.latitude, lng: item.longitude }}
                    onClick={() => handleMarkerClick(item)}
                    icon={getMarkerIcon(item)}
                  />
                )
              })}
            </GoogleMap>
          </div>
          <div className="lg:col-span-1 bg-background border-l">
            <ScrollArea className="h-full max-h-[calc(100vh-10rem)]">
               {selectedItem ? (
                    <div className="p-4">
                       <Card>
                        {selectedItem.itemType === 'intervention' && (
                          <>
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {(selectedItem as Intervention).type === 'new_installation' ? <HardHat/> : <Wrench/>}
                                    {selectedItem.title}
                                </CardTitle>
                                <CardDescription>{selectedClient?.name}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                                <div className="flex gap-2 mt-4">
                                    <Button onClick={() => handleOpenInterventionModal(selectedItem as Intervention)}>Vedi Dettagli</Button>
                                    {selectedClient?.address && (
                                        <Button variant="outline" asChild>
                                             <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedClient.address)}`} target="_blank" rel="noopener noreferrer">
                                                <Navigation className="mr-2 h-4 w-4" /> Naviga
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                          </>
                        )}
                         {selectedItem.itemType === 'appointment' && (
                          <>
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><ClipboardCheck/>{selectedItem.title}</CardTitle>
                                <CardDescription>{clientsMap.get(selectedItem.clientId)?.name}</CardDescription>
                            </CardHeader>
                            <CardContent>
                               <div className="space-y-1 text-sm">
                                  <p><b>Indirizzo:</b> {(selectedItem as Appointment).address}</p>
                                  <p><b>Data:</b> {format(new Date((selectedItem as Appointment).date!), 'dd/MM/yyyy HH:mm')}</p>
                                  <p><b>Stato:</b> {(selectedItem as Appointment).status}</p>
                               </div>
                               <div className="flex gap-2 mt-4">
                                <Button onClick={() => router.push('/dashboard/appointments')}>Gestisci</Button>
                                 {(selectedItem as Appointment).address && (
                                    <Button variant="outline" asChild>
                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((selectedItem as Appointment).address!)}`} target="_blank" rel="noopener noreferrer">
                                            <Navigation className="mr-2 h-4 w-4" /> Naviga
                                        </a>
                                    </Button>
                                 )}
                               </div>
                            </CardContent>
                          </>
                        )}
                        {selectedItem.itemType === 'client' && (
                           <>
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><MapPin/>{(selectedItem as User).name}</CardTitle>
                                <CardDescription>{(selectedItem as User).address}</CardDescription>
                            </CardHeader>
                            <CardContent>
                               <p className="text-sm text-muted-foreground">Cliente generico. Nessuna attività aperta associata.</p>
                               <div className="flex gap-2 mt-4">
                                <Button onClick={() => router.push('/dashboard/clients')}>Vai a Cliente</Button>
                                {(selectedItem as User).address && (
                                <Button variant="outline" asChild>
                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((selectedItem as User).address!)}`} target="_blank" rel="noopener noreferrer">
                                        <Navigation className="mr-2 h-4 w-4" /> Naviga
                                    </a>
                                </Button>
                                )}
                               </div>
                            </CardContent>
                           </>
                        )}

                        </Card>

                    </div>
               ) : (
                 <div className="p-4 text-center text-muted-foreground h-full flex items-center justify-center">
                    <p>Seleziona un elemento sulla mappa per vedere i dettagli.</p>
                </div>
               )}
            </ScrollArea>
          </div>
        </div>
      </main>
    </>
  );
}

