
'use client';

import { Header } from '@/components/dashboard/header';
import { getUsers } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AddUserForm } from '@/components/dashboard/add-user-form';
import { PlusCircle, Loader } from 'lucide-react';
import { ClientsTable } from '@/components/dashboard/clients-table';

export default function ClientsPage() {
  const { user, currentCompany } = useUser();
  const router = useRouter();
  const [clientList, setClientList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'Admin' && user.role !== 'Creator') {
      router.push('/dashboard');
      return;
    }
    
    async function fetchClients() {
      if (!currentCompany) return;
      setIsLoading(true);
      const usersFromDb = await getUsers(currentCompany.id);
      setClientList(usersFromDb.filter(u => u.role === 'Client'));
      setIsLoading(false);
    }

    if (user) {
        fetchClients();
    }
  }, [user, router, currentCompany]);
  
  if(!user || !currentCompany) return null;

  const handleClientAdded = (newClient: User) => {
    if (newClient.role === 'Client') {
      setClientList(prevClients => [...prevClients, newClient]);
    }
  };

  const handleClientUpdated = (updatedClient: User) => {
    setClientList(prevClients => prevClients.map(c => c.id === updatedClient.id ? updatedClient : c));
  }
  
  const handleClientDeleted = (deletedClientId: string) => {
    setClientList(prevClients => prevClients.filter(c => c.id !== deletedClientId));
  }

  if (user.role !== 'Admin' && user.role !== 'Creator') {
    return null; 
  }

  return (
    <>
      <Header title="Clienti" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <div className="flex justify-end mb-4">
            <AddUserForm onUserAdded={handleClientAdded} defaultRole="Client" isClientForm={true}>
              <Button>
                <PlusCircle className="mr-2" />
                Crea Cliente
              </Button>
            </AddUserForm>
        </div>
        {isLoading ? (
            <div className="flex items-center justify-center pt-20">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        ) : (
            <ClientsTable clients={clientList} onClientUpdated={handleClientUpdated} onClientDeleted={handleClientDeleted} />
        )}
      </main>
    </>
  );
}
