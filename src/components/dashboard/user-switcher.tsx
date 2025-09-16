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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
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
            <p className="text-sm text-muted-foreground hidden md:block">Simula come:</p>
            <Select value={user.id} onValueChange={switchUser}>
                <SelectTrigger className="w-auto border-none shadow-none focus:ring-0 gap-2 bg-transparent hidden sm:flex">
                <SelectValue asChild>
                    <div className='flex items-center gap-2'>
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className='hidden lg:inline'>{user.name}</span>
                    </div>
                </SelectValue>
                </SelectTrigger>
                <SelectContent>
                {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
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
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
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
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <UserIcon className="mr-2" />
                    Profilo
                </DropdownMenuItem>
                 <DropdownMenuItem className="sm:hidden">
                    <Users className="mr-2" />
                    Cambia Utente
                </DropdownMenuItem>
                <DropdownMenuSeparator className="sm:hidden"/>
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2" />
                    Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
