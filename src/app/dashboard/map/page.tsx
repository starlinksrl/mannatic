
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { GoogleMap, MarkerF, InfoWindow } from '@react-google-maps/api';
import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { getUsers, getInterventions, getScheduledMaintenance } from '@/lib/data';
import { User, Intervention, ScheduledMaintenance } from '@/lib/types';
import { Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMaps } from '@/contexts/maps-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isBefore, addDays, startOfToday } from 'date-fns';


const mapContainerStyle = {
  width: '100%',
  height: '70vh',
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
      // Combine all work types into one array for filtering
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
            // Standard open interventions
            if (i.isMaintenance === false && i.type === 'standard' && openInterventionStatuses.includes(i.status)) {
                return true;
            }
            // New installations that are not completed or cancelled
            if (i.type === 'new_installation' && i.status !== 'Completato' && i.status !== 'Annullato') {
                return true;
            }
            // Scheduled maintenance due in the next 30 days
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
  
  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);
  
  useEffect(() => {
    if (map && clientsToDisplay.length > 0) {
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
    } else if (map) {
       map.setCenter(defaultCenter);
       map.setZoom(6);
    }
  }, [map, clientsToDisplay]);

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
        <div className="relative" style={{ height: mapContainerStyle.height }}>
          <GoogleMap 
            mapContainerStyle={{width: '100%', height: '100%'}} 
            center={defaultCenter}
            zoom={6}
            onLoad={onLoad}
            onUnmount={onUnmount}
          >
            {clientsToDisplay.map(client => {
              const isNewInstallation = clientsWithNewInstallation.has(client.id);
              const markerIcon = isNewInstallation ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: '#4285F4', // Blue color
                  fillOpacity: 1,
                  strokeWeight: 0,
                  scale: 8,
              } : undefined;

              return (
                client.latitude && client.longitude &&
                <MarkerF
                  key={client.id}
                  position={{ lat: client.latitude, lng: client.longitude }}
                  onClick={() => setSelectedClient(client)}
                  icon={markerIcon}
                />
              )
            })}

            {selectedClient && selectedClient.latitude && selectedClient.longitude && (
              <InfoWindow
                position={{ lat: selectedClient.latitude, lng: selectedClient.longitude }}
                onCloseClick={() => setSelectedClient(null)}
              >
                <div>
                  <h3 className="font-bold">{selectedClient.name}</h3>
                  <p>{selectedClient.address}</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>
        <div className="p-4 flex-grow">
            <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Clienti Visualizzati</CardTitle>
                     <div className="w-[250px]">
                        <Select value={filter} onValueChange={(value) => setFilter(value as 'open' | 'all')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Filtra clienti..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Clienti con interventi aperti</SelectItem>
                            <SelectItem value="all">Tutti i clienti</SelectItem>
                          </SelectContent>
                        </Select>
                     </div>
                  </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-48">
                        {clientsToDisplay.length > 0 ? (
                            <ul>
                                {clientsToDisplay.map(client => (
                                    <li key={client.id} className="text-sm p-1">
                                        {client.name} - (Lat: {client.latitude?.toFixed(4)}, Lng: {client.longitude?.toFixed(4)})
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nessun cliente da visualizzare con i filtri correnti.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </main>
    </>
  );
}
