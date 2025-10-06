

'use client';

import { useEffect, useState, useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindow, Circle } from '@react-google-maps/api';
import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { getUsers } from '@/lib/data';
import { User } from '@/lib/types';
import { Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMaps } from '@/contexts/maps-context';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

const mapContainerStyle = {
  width: '100%',
  height: '70vh', // Adjusted height to make space for the list
};

const center = {
  lat: 41.8719,
  lng: 12.5674,
};

type ClientWithLocation = User;

export default function MapPage() {
  const { isLoaded, loadError } = useMaps();

  const { currentCompany } = useUser();
  const [clientsWithLocation, setClientsWithLocation] = useState<ClientWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientWithLocation | null>(null);
  const [distance, setDistance] = useState(30); // Default distance in km

  useEffect(() => {
    async function fetchData() {
      if (!currentCompany || !isLoaded) return;
      setLoading(true);

      const allUsers = await getUsers(currentCompany.id);
      
      const allClients = allUsers.filter(u => u.role === 'Client' && u.latitude && u.longitude);
      
      setClientsWithLocation(allClients as ClientWithLocation[]);
      setLoading(false);
    }
    fetchData();
  }, [currentCompany, isLoaded]);

  const nearbyClients = useMemo(() => {
    if (!selectedClient || !isLoaded || !selectedClient.latitude || !selectedClient.longitude) return [];
    
    return clientsWithLocation.filter(client => {
      if (client.id === selectedClient.id || !client.latitude || !client.longitude) return false;
      
      const distanceInMeters = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(selectedClient.latitude!, selectedClient.longitude!),
        new google.maps.LatLng(client.latitude, client.longitude)
      );

      return distanceInMeters <= distance * 1000;
    });
  }, [selectedClient, clientsWithLocation, distance, isLoaded]);


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
            {clientsWithLocation.map(client => (
              <MarkerF
                key={client.id}
                position={{ lat: client.latitude!, lng: client.longitude! }}
                onClick={() => setSelectedClient(client)}
              />
            ))}

            {selectedClient && selectedClient.latitude && selectedClient.longitude && (
              <>
                <InfoWindow
                  position={{ lat: selectedClient.latitude, lng: selectedClient.longitude }}
                  onCloseClick={() => setSelectedClient(null)}
                >
                  <div>
                    <h3 className="font-bold">{selectedClient.name}</h3>
                    <p>{selectedClient.address}</p>
                  </div>
                </InfoWindow>
                <Circle
                  center={{ lat: selectedClient.latitude, lng: selectedClient.longitude }}
                  radius={distance * 1000}
                  options={{
                      strokeColor: '#FF0000',
                      strokeOpacity: 0.8,
                      strokeWeight: 2,
                      fillColor: '#FF0000',
                      fillOpacity: 0.15,
                  }}
                />
                {nearbyClients.map(client => (
                  <MarkerF
                      key={`nearby-${client.id}`}
                      position={{ lat: client.latitude!, lng: client.longitude! }}
                      icon={{
                          path: window.google.maps.SymbolPath.CIRCLE,
                          scale: 8,
                          fillColor: 'blue',
                          fillOpacity: 0.8,
                          strokeWeight: 0
                      }}
                      onClick={() => setSelectedClient(client)}
                  />
                ))}
              </>
            )}
          </GoogleMap>
          <Card className="absolute top-4 left-4 p-4">
              <CardContent className="p-0 space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="distance-filter">Raggio di vicinanza</Label>
                      <Select value={String(distance)} onValueChange={(val) => setDistance(Number(val))}>
                          <SelectTrigger id="distance-filter" className="w-[180px]">
                              <SelectValue placeholder="Seleziona distanza" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="10">10 km</SelectItem>
                              <SelectItem value="30">30 km</SelectItem>
                              <SelectItem value="100">100 km</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </CardContent>
          </Card>
        </div>
        <div className="p-4 flex-grow">
            <Card>
                <CardHeader>
                    <CardTitle>Clienti da Visualizzare sulla Mappa</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-48">
                        {clientsWithLocation.length > 0 ? (
                            <ul>
                                {clientsWithLocation.map(client => (
                                    <li key={client.id} className="text-sm p-1">
                                        {client.name} - (Lat: {client.latitude}, Lng: {client.longitude})
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
