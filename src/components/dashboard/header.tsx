import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { SidebarNav } from './sidebar-nav';
import { UserSwitcher } from './user-switcher';
import { NotificationsDropdown } from './notifications-dropdown';

export function Header({ title }: { title: string }) {
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
          <SidebarNav />
        </SheetContent>
      </Sheet>
      <div className="flex-1">
        <h1 className="font-headline text-xl font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <UserSwitcher />
        <NotificationsDropdown />
      </div>
    </header>
  );
}
