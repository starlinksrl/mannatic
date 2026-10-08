
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

    if (isMainCreatorView) {
      // Main creator sees all Creators and Distributors
      const all = await getUsers();
      setUserList(all.filter(u => u.role === 'Creator' || u.role === 'Distributor'));
    } else if (user.role === 'Admin' && currentCompany) {
      // Installer admin sees team members of their company (no clients)
      const all = await getUsers(currentCompany.id);
      setUserList(all.filter(u => u.role !== 'Client'));
    } else {
      setUserList([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    // Only Creator (main) and Installer Admin can access this page
    if (!user) return;
    if (user.role !== 'Admin' && !isMainCreator(user)) {
      router.push('/dashboard');
      return;
    }
    // Installer Admin without a selected company → redirect
    if (user.role === 'Admin' && !currentCompany) {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user, router, currentCompany]);

  if (!user) return null;
  if (user.role !== 'Admin' && !isMainCreatorView) return null;
  if (user.role === 'Admin' && !currentCompany) return null;

  const getTitle = () => {
    if (isMainCreatorView) return 'Creators & Distributori';
    return 'Utenti';
  };

  const getButtonLabel = () => {
    if (isMainCreatorView) return 'Crea Creator / Distributore';
    return 'Crea Utente';
  };

  const canCreateUser = isMainCreatorView || (user.role === 'Admin' && currentCompany);
  const defaultCreateRole = isMainCreatorView ? 'Creator' : 'Operator';

  return (
    <>
      <Header title={getTitle()} />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        {canCreateUser && (
          <div className="flex justify-end mb-4">
            <AddUserForm
              onUserAdded={fetchData}
              defaultRole={defaultCreateRole}
              companyId={isMainCreatorView ? undefined : currentCompany?.id}
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
