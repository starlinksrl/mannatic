
'use client';

import { Header } from '@/components/dashboard/header';
import { InterventionsTable } from '@/components/dashboard/interventions-table';
import { getInterventions, getUsers, getClients } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User, Intervention, Client } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Loader, Mail, Phone, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';


export default function ClientRequestsPage() {
    const { user, currentCompany } = useUser();
    const router = useRouter();
    const [operators, setOperators] = useState<User[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user || !currentCompany) return;
        setLoading(true);
        
        if (user.role !== 'Client') {
          setLoading(false);
          return;
        }

        const [allUsers, allClients, allInterventions] = await Promise.all([
            getUsers(currentCompany.id),
            getClients(currentCompany.id),
            getInterventions(currentCompany.id)
        ]);

        setOperators(allUsers.filter(u => u.role === 'Operator'));
        setClients(allClients.filter(c => c.id === user.id));
        setInterventions(allInterventions.filter(i => i.clientId === user.id));
        setLoading(false);
    }

    useEffect(() => {
        if (user && user.role !== 'Client') {
          router.push('/dashboard');
        }

        fetchData();
    }, [user, currentCompany, router]);
    
    if (user?.role !== 'Client') {
      return null;
    }


    if (!user || loading) {
        return (
            <>
                <Header title="Le mie Richieste" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

  return (
    <>
      <Header title="Le mie Richieste" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto space-y-6">
        {clients.map(client => (
            <Card key={client.id}>
                <CardHeader>
                    <CardTitle>Informazioni di Contatto</CardTitle>
                    <CardDescription>Dettagli per {client.name}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    {client.address && (
                         <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                            <MapPin className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"/>
                            <div>
                                <p className="font-medium group-hover:text-primary transition-colors">{client.address}</p>
                                <p className="text-sm text-muted-foreground">Clicca per aprire la mappa</p>
                            </div>
                        </a>
                    )}
                    {client.phone && (
                        <a href={`tel:${client.phone}`} className="flex items-center gap-3 group">
                            <Phone className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"/>
                            <div>
                                <p className="font-medium group-hover:text-primary transition-colors">{client.phone}</p>
                                <p className="text-sm text-muted-foreground">Clicca per chiamare</p>
                            </div>
                        </a>
                    )}
                </CardContent>
            </Card>
        ))}

        <Separator />
      
        <InterventionsTable 
            interventions={interventions} 
            currentUser={user} 
            clients={clients} 
            operators={operators}
            onInterventionChange={fetchData}
        />
      </main>
    </>
  );
}
