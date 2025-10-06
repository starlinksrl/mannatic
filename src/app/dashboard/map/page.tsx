'use client';

import { useEffect, useState, useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindow } from '@react-google-maps/api';
import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { getUsers, getInterventions } from '@/lib/data';
import { User, Intervention } from '@/lib/types';
import { Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMaps } from '@/contexts/maps-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mapContainerStyle = {
  width: '100%',
  height: '70vh',
};

const center = {
  lat: 41.8719,
  lng: 12.5674,
};

type ClientWithLocation = User;

export default function MapPage() {
  const { isLoaded, loadError } = useMaps();
  const { currentCompany } = useUser();
  const [allClients, setAllClients] = useState<ClientWithLocation[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientWithLocation | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');

  useEffect(() => {
    async function fetchData() {
      if (!currentCompany || !isLoaded) return;
      setLoading(true);

      const [allUsers, allInterventions] = await Promise.all([
        getUsers(currentCompany.id),
        getInterventions(currentCompany.id),
      ]);
      
      const clientsWithCoords = allUsers.filter(
        u => u.role === 'Client' && u.latitude && u.longitude
      );
      
      setAllClients(clientsWithCoords);
      setInterventions(allInterventions);
      setLoading(false);
    }
    fetchData();
  }, [currentCompany, isLoaded]);

  const clientsToDisplay = useMemo(() => {
    if (filter === 'all') {
      return allClients;
    }

    // Filter for 'open' interventions
    const openInterventionStatuses = ['Nuovo', 'In corso', 'In attesa'];
    const clientIdsWithOpenInterventions = new Set(
      interventions
        .filter(i => openInterventionStatuses.includes(i.status))
        .map(i => i.clientId)
    );
    
    return allClients.filter(client => clientIdsWithOpenInterventions.has(client.id));
  }, [filter, allClients, interventions]);

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
          <GoogleMap mapContainerStyle={{width: '100%', height: '100%'}} zoom={6} center={center}>
            {clientsToDisplay.map(client => (
              client.latitude && client.longitude &&
              <MarkerF
                key={client.id}
                position={{ lat: client.latitude, lng: client.longitude }}
                onClick={() => setSelectedClient(client)}
              />
            ))}

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
                     <div className="w-[200px]">
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
