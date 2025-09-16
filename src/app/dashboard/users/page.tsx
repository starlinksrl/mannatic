'use client';

import { Header } from '@/components/dashboard/header';
import { UsersTable } from '@/components/dashboard/users-table';
import { users } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AddUserForm } from '@/components/dashboard/add-user-form';
import { PlusCircle } from 'lucide-react';

export default function UsersPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userList, setUserList] = useState(users);

  useEffect(() => {
    if (user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, router]);
  
  const handleUserAdded = (newUser: User) => {
    setUserList(prevUsers => [...prevUsers, newUser]);
  };


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
        <UsersTable users={userList} />
      </main>
    </>
  );
}
