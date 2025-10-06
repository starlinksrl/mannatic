

'use client';

import { useEffect, useState, useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindow } from '@react-google-maps/api';
import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { getUsers, geocodeAddress, updateUser } from '@/lib/data';
import { User } from '@/lib/types';
import { Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMaps } from '@/contexts/maps-context';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [clients, setClients] = useState<ClientWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientWithLocation | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!currentCompany || !isLoaded) return;
      setLoading(true);

      const allUsers = await getUsers(currentCompany.id);
      const allClients = allUsers.filter(u => u.role === 'Client');
      
      const clientsWithCoords = allClients.filter(c => c.latitude && c.longitude);
      const clientsWithoutCoords = allClients.filter(c => c.address && (!c.latitude || !c.longitude));

      const geocodedClients: ClientWithLocation[] = [];

      for (const client of clientsWithoutCoords) {
        if (client.address) {
          const location = await geocodeAddress(client.address);
          if (location) {
            const updatedClient = { ...client, latitude: location.lat, longitude: location.lng };
            geocodedClients.push(updatedClient);
            // Save back to DB, but don't wait for it to complete to show the map
            updateUser(client.id, { latitude: location.lat, longitude: location.lng });
          }
        }
      }
      
      setClients([...clientsWithCoords, ...geocodedClients]);
      setLoading(false);
    }
    fetchData();
  }, [currentCompany, isLoaded]);

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
            {clients.map(client => (
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
                    <CardTitle>Clienti da Visualizzare sulla Mappa</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-48">
                        {clients.length > 0 ? (
                            <ul>
                                {clients.map(client => (
                                    <li key={client.id} className="text-sm p-1">
                                        {client.name} - (Lat: {client.latitude?.toFixed(4)}, Lng: {client.longitude?.toFixed(4)})
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nessun cliente con coordinate valide trovato in questa azienda.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </main>
    </>
  );
}
