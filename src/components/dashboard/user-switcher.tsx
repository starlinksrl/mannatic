

'use client';

import { useUser } from '@/contexts/user-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { LogOut, ChevronsUpDown, User as UserIcon, Users, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EditUserForm } from './edit-user-form';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';

export function UserSwitcher() {
  const { user, sessionUser, switchUser, availableUsers, logout, companies, currentCompany, switchCompany } = useUser();
  const router = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();


  const handleLogout = () => {
    logout();
    router.push('/login');
  }

  const handleSwitchUser = (userId: string) => {
    switchUser(userId);
  }
  
  const handleSwitchCompany = (companyId: string) => {
    switchCompany(companyId);
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
        {/* Company Switcher or Display */}
        {sessionUser?.role === 'Creator' ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden md:flex gap-2">
                <Building />
                <span className="hidden lg:inline">{currentCompany?.name || 'Seleziona Azienda'}</span>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Cambia Azienda</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companies.map(company => (
                <DropdownMenuItem key={company.id} onSelect={() => handleSwitchCompany(company.id)}>
                  {company.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          currentCompany && (
              <div className="hidden md:flex items-center gap-2">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium hidden lg:inline">{currentCompany.name}</span>
              </div>
          )
        )}

        {/* User simulator */}
        {sessionUser?.role === 'Creator' && currentCompany && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden md:flex gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-col items-start hidden lg:flex">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.role}</span>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Simula come:</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {availableUsers.map((u) => (
                          <DropdownMenuItem key={u.id} onSelect={() => handleSwitchUser(u.id)}>
                          <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatarUrl} alt={u.name} />
                              <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.role}</p>
                              </div>
                          </div>
                          </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2" />
                      Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

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
            {sessionUser?.role === 'Creator' && (
                <>
                  {isMobile ? (
                      <>
                        <DropdownMenuLabel className="text-muted-foreground">Cambia Azienda</DropdownMenuLabel>
                        {companies.map(company => (
                          <DropdownMenuItem key={company.id} onSelect={() => handleSwitchCompany(company.id)}>
                              {company.name}
                          </DropdownMenuItem>
                        ))}
                        {currentCompany && (
                            <>
                                <DropdownMenuSeparator/>
                                <DropdownMenuLabel className="text-muted-foreground">Cambia Utente</DropdownMenuLabel>
                                {availableUsers.map((u) => (
                                    <DropdownMenuItem key={u.id} onSelect={() => handleSwitchUser(u.id)}>
                                        {u.name}
                                    </DropdownMenuItem>
                                ))}
                            </>
                        )}
                      </>
                  ) : (
                    <>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Building className="mr-2" />
                                <span>Cambia Azienda</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    {companies.map(company => (
                                        <DropdownMenuItem key={company.id} onSelect={() => handleSwitchCompany(company.id)}>
                                            {company.name}
                                        </DropdownMenuItem>
                                        ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        {currentCompany && (
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Users className="mr-2" />
                                    <span>Cambia Utente</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    {availableUsers.map((u) => (
                                        <DropdownMenuItem key={u.id} onSelect={() => handleSwitchUser(u.id)}>
                                            <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={u.avatarUrl} alt={u.name} />
                                                <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{u.name}</p>
                                                <p className="text-xs text-muted-foreground">{u.role}</p>
                                            </div>
                                            </div>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                        )}
                    </>
                  )}
                  <DropdownMenuSeparator/>
                </>
            )}

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

    
