'use client';

import { Header } from '@/components/dashboard/header';
import { UsersTable } from '@/components/dashboard/users-table';
import { users } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UsersPage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user.role !== 'Admin') {
    return null; 
  }

  return (
    <>
      <Header title="Utenti" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <UsersTable users={users} />
      </main>
    </>
  );
}
