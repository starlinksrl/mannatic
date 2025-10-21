

'use client';

import { Header } from '@/components/dashboard/header';
import { UsersTable } from '@/components/dashboard/users-table';
import { getUsers } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AddUserForm } from '@/components/dashboard/add-user-form';
import { PlusCircle, Loader } from 'lucide-react';


export default function UsersPage() {
  const { user, currentCompany } = useUser();
  const router = useRouter();
  const [userList, setUserList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const usersFromDb = await getUsers(currentCompany?.id); // Pass optional companyId
    
    if (user?.role === 'Creator' && !currentCompany) {
        // Main Creator view: only see other creators
        setUserList(usersFromDb.filter(u => u.role === 'Creator'));
    } else {
        // Admin or Impersonating Creator view: see company users
        setUserList(usersFromDb.filter(u => u.role !== 'Client'));
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (user && user.role !== 'Admin' && user.role !== 'Creator') {
      router.push('/dashboard');
      return;
    }
    
    if (user) {
        fetchData();
    }
  }, [user, router, currentCompany]);
  
  if(!user) return null;
  if(user.role === 'Admin' && !currentCompany) return null;


  if (user.role !== 'Admin' && user.role !== 'Creator') {
    return null; 
  }
  
  const getButtonLabel = () => {
    if (user?.role === 'Creator' && !currentCompany) {
        return "Crea Creator";
    }
    return "Crea Utente";
  }

  return (
    <>
      <Header title="Utenti" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <div className="flex justify-end mb-4">
            <AddUserForm 
                onUserAdded={fetchData} 
                defaultRole={user?.role === 'Creator' && !currentCompany ? 'Creator' : 'Operator'}
            >
              <Button>
                <PlusCircle className="mr-2" />
                {getButtonLabel()}
              </Button>
            </AddUserForm>
        </div>
        {isLoading ? (
            <div className="flex items-center justify-center pt-20">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        ) : (
            <UsersTable users={userList} onDataChange={fetchData} />
        )}
      </main>
    </>
  );
}
