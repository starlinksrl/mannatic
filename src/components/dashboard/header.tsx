

'use client';

import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, Menu, Smartphone } from 'lucide-react';
import { SidebarNav } from './sidebar-nav';
import { UserSwitcher } from './user-switcher';
import { NotificationsDropdown } from './notifications-dropdown';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { Intervention, Client, User } from '@/lib/types';
import Image from 'next/image';

interface HeaderProps {
  title: string;
  onInterventionAdded?: (intervention: Intervention) => void;
  clients?: Client[];
  operators?: User[];
}


export function Header({ title, onInterventionAdded, clients, operators }: HeaderProps) {
  const { user, currentCompany, switchCompany } = useUser();
  const router = useRouter();

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
         {currentCompany && user?.role !== 'Creator' && user?.role !== 'Distributor' && (
          <div className="flex items-center gap-2">
            {currentCompany.logoUrl ? (
                <Image src={currentCompany.logoUrl} alt={currentCompany.name} width={28} height={28} className="rounded-md object-contain" />
            ) : (
                <Building className="h-5 w-5 text-muted-foreground" />
            )}
             <span className="font-medium hidden md:inline">{currentCompany.name}</span>
          </div>
        )}
        <h1 className="font-headline text-lg sm:text-xl font-semibold truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border-dashed px-2 sm:px-3 h-8 sm:h-9"
        >
          <a href="/mannatic.apk" download="mannatic.apk" title="Scarica Applicazione Android">
            <Smartphone className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="hidden min-[420px]:inline">App Android</span>
          </a>
        </Button>
        <UserSwitcher />
        <NotificationsDropdown />
      </div>
    </header>
  );
}
