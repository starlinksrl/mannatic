

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

const isMainCreator = (user: User | null) => user?.email === 'creator@mannatic.com';

export default function UsersPage() {
  const { user, currentCompany } = useUser();
  const router = useRouter();
  const [userList, setUserList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isMainCreatorView = isMainCreator(user);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    
    let usersFromDb: User[] = [];
    if (isMainCreatorView) {
      usersFromDb = await getUsers();
      setUserList(usersFromDb.filter(u => u.role === 'Creator'));
    } else if (currentCompany) {
      usersFromDb = await getUsers(currentCompany.id);
       setUserList(usersFromDb.filter(u => u.role !== 'Client'));
    } else {
        setUserList([]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    // Redirect non-admins or regular creators if they try to access this page
    // This page is now for Admins (in a company) or the Main Creator (global)
    if (user && user.role !== 'Admin' && !isMainCreator(user)) {
      router.push('/dashboard');
      return;
    }
    
    if (user) {
        fetchData();
    }
  }, [user, router, currentCompany]);
  
  if(!user) return null;
  if(user.role === 'Admin' && !currentCompany) return null;


  if (user.role !== 'Admin' && !isMainCreator(user)) {
    return null; 
  }
  
  const getButtonLabel = () => {
    if (isMainCreatorView) {
        return "Crea Creator";
    }
    return "Crea Utente";
  }
  
  const getTitle = () => {
     if (isMainCreatorView) {
        return "Creators";
    }
    return "Utenti";
  }

  const canCreateUser = isMainCreatorView || (user.role === 'Admin' && currentCompany);

  return (
    <>
      <Header title={getTitle()} />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        {canCreateUser && (
            <div className="flex justify-end mb-4">
                <AddUserForm 
                    onUserAdded={fetchData} 
                    defaultRole={isMainCreatorView ? 'Creator' : 'Operator'}
                >
                <Button>
                    <PlusCircle className="mr-2" />
                    {getButtonLabel()}
                </Button>
                </AddUserForm>
            </div>
        )}
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
