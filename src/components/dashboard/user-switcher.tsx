'use client';

import { useUser } from '@/contexts/user-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { LogOut, ChevronsUpDown, User as UserIcon, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function UserSwitcher() {
  const { user, switchUser, availableUsers, logout } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-4">
        {/* Simulator for demo purposes */}
        <div className="flex items-center gap-2">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                     <Button variant="ghost" className="hidden md:flex gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-col items-start hidden lg:flex">
                           <span className='font-medium'>{user.name}</span>
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
                           <DropdownMenuItem key={u.id} onSelect={() => switchUser(u.id)}>
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
                </DropdownMenuContent>
             </DropdownMenu>
        </div>
        
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
                <DropdownMenuItem>
                    <UserIcon className="mr-2" />
                    Profilo
                </DropdownMenuItem>
                 <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="md:hidden">
                        <Users className="mr-2" />
                        <span>Cambia Utente</span>
                    </DropdownMenuSubTrigger>
                     <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            {availableUsers.map((u) => (
                                <DropdownMenuItem key={u.id} onSelect={() => switchUser(u.id)}>
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
                <DropdownMenuSeparator className="md:hidden"/>
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2" />
                    Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
