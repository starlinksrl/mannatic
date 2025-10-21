

'use client';

import { useUser } from '@/contexts/user-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { LogOut, ChevronsUpDown, User as UserIcon, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EditUserForm } from './edit-user-form';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/lib/types';

export function UserSwitcher() {
  const { user, logout, companies, currentCompany, switchCompany } = useUser();
  const router = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    router.push('/login');
  }

  const handleProfileUpdated = (updatedUser: User) => {
    // The user context will refresh itself on the next load,
    // so we just need to notify the user.
    toast({
        title: 'Profilo aggiornato',
        description: 'I tuoi dati sono stati aggiornati con successo. Le modifiche saranno visibili a breve.'
    });
  }

  if (!user) return null;

  return (
    <>
      <div className="flex items-center gap-4">
        {(user.role !== 'Creator' && currentCompany) && (
              <div className="hidden md:flex items-center gap-2">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium hidden lg:inline">{currentCompany.name}</span>
              </div>
          )
        }
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setIsProfileModalOpen(true)}>
                <UserIcon className="mr-2" />
                Profilo
            </DropdownMenuItem>

            <DropdownMenuSeparator/>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
       <EditUserForm 
          user={user}
          onUserUpdated={handleProfileUpdated}
          isOpen={isProfileModalOpen}
          setIsOpen={setIsProfileModalOpen}
      />
    </>
  );
}

    
