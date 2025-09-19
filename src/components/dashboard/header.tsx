'use client';

import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Menu } from 'lucide-react';
import { SidebarNav } from './sidebar-nav';
import { UserSwitcher } from './user-switcher';
import { NotificationsDropdown } from './notifications-dropdown';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';

export function Header({ title }: { title: string }) {
  const { sessionUser, currentCompany, switchCompany } = useUser();
  const router = useRouter();

  const handleReturnToCompanies = () => {
    // This action implicitly switches the user to creator and clears the company
    switchCompany(null);
    router.push('/dashboard/companies');
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 sticky top-0 z-30">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu di Navigazione</SheetTitle>
          </SheetHeader>
          <SidebarNav />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-4 flex-1">
        {sessionUser?.role === 'Creator' && currentCompany && (
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleReturnToCompanies}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Torna alle aziende</span>
          </Button>
        )}
        <h1 className="font-headline text-xl font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <UserSwitcher />
        <NotificationsDropdown />
      </div>
    </header>
  );
}
