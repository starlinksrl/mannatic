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

const universalAdminId = 'user-sbi';

export default function UsersPage() {
  const { user } = useUser();
  const router = useRouter();
  const [userList, setUserList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      router.push('/dashboard');
      return;
    }
    
    async function fetchUsers() {
      setIsLoading(true);
      const usersFromDb = await getUsers();
      setUserList(usersFromDb.filter(u => u.id !== universalAdminId));
      setIsLoading(false);
    }

    if (user) {
        fetchUsers();
    }
  }, [user, router]);
  
  if(!user) return null;

  const handleUserAdded = (newUser: User) => {
    if (newUser.id !== universalAdminId) {
      setUserList(prevUsers => [...prevUsers, newUser]);
    }
  };

  const handleUserUpdated = (updatedUser: User) => {
    setUserList(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
  }
  
  const handleUserDeleted = (deletedUserId: string) => {
    setUserList(prevUsers => prevUsers.filter(u => u.id !== deletedUserId));
  }


  if (user.role !== 'Admin') {
    return null; 
  }

  return (
    <>
      <Header title="Utenti" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <div className="flex justify-end mb-4">
            <AddUserForm onUserAdded={handleUserAdded}>
              <Button>
                <PlusCircle className="mr-2" />
                Crea Utente
              </Button>
            </AddUserForm>
        </div>
        {isLoading ? (
            <div className="flex items-center justify-center pt-20">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        ) : (
            <UsersTable users={userList} onUserUpdated={handleUserUpdated} onUserDeleted={handleUserDeleted} />
        )}
      </main>
    </>
  );
}
