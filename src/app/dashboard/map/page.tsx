

'use client';

import { useEffect, useState, useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindow, Circle } from '@react-google-maps/api';
import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { getClients, getInterventions, geocodeAddress } from '@/lib/data';
import { Client, Intervention } from '@/lib/types';
import { Loader, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMaps } from '@/contexts/maps-context';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 41.8719,
  lng: 12.5674,
};

type ClientWithLocation = Client & {
  location: { lat: number; lng: number };
  openInterventionsCount: number;
};

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

      const [clients, interventions] = await Promise.all([
        getClients(currentCompany.id),
        getInterventions(currentCompany.id),
      ]);
      
      const openInterventionStatuses = ['Nuovo', 'In corso', 'In attesa'];
      const openInterventions = interventions.filter(i => openInterventionStatuses.includes(i.status));

      const clientsWithOpenInterventions = clients.map(client => {
        const count = openInterventions.filter(i => i.clientId === client.id).length;
        return { ...client, openInterventionsCount: count };
      }).filter(c => c.openInterventionsCount > 0 && c.address);

      const geocodedClients = await Promise.all(
        clientsWithOpenInterventions.map(async client => {
          try {
            const location = await geocodeAddress(client.address!);
            return { ...client, location };
          } catch (error) {
            console.error(`Geocoding failed for ${client.address}:`, error);
            return null;
          }
        })
      );

      setClientsWithLocation(geocodedClients.filter(c => c !== null) as ClientWithLocation[]);
      setLoading(false);
    }
    fetchData();
  }, [currentCompany, isLoaded]);

  const nearbyClients = useMemo(() => {
    if (!selectedClient || !isLoaded) return [];
    
    return clientsWithLocation.filter(client => {
      if (client.id === selectedClient.id) return false;
      
      const distanceInMeters = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(selectedClient.location),
        new google.maps.LatLng(client.location)
      );

      return distanceInMeters <= distance * 1000;
    });
  }, [selectedClient, clientsWithLocation, distance, isLoaded]);


  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded || loading) {
    return (
        <>
            <Header title="Mappa Interattiva" />
            <div className="flex items-center justify-center flex-1">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        </>
    )
  }

  return (
    <>
      <Header title="Mappa Interattiva" />
      <main className="flex-1 relative">
        <GoogleMap mapContainerStyle={mapContainerStyle} zoom={6} center={center}>
          {clientsWithLocation.map(client => (
            <MarkerF
              key={client.id}
              position={client.location}
              onClick={() => setSelectedClient(client)}
            />
          ))}

          {selectedClient && (
            <>
              <InfoWindow
                position={selectedClient.location}
                onCloseClick={() => setSelectedClient(null)}
              >
                <div>
                  <h3 className="font-bold">{selectedClient.name}</h3>
                  <p>{selectedClient.address}</p>
                  <p>{selectedClient.openInterventionsCount} intervent{selectedClient.openInterventionsCount > 1 ? 'i' : 'o'} aperti</p>
                </div>
              </InfoWindow>
              <Circle
                center={selectedClient.location}
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
                    position={client.location}
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
         <Card className="absolute top-4 left-4 p-4 space-y-2">
            <h4 className="font-semibold">Raggio di vicinanza</h4>
             <Select value={String(distance)} onValueChange={(val) => setDistance(Number(val))}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleziona distanza" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10 km</SelectItem>
                    <SelectItem value="30">30 km</SelectItem>
                    <SelectItem value="100">100 km</SelectItem>
                </SelectContent>
            </Select>
         </Card>
      </main>
    </>
  );
}
