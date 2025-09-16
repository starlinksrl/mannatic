'use client';

import { useUser } from '@/contexts/user-context';
import { users } from '@/lib/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ChevronsUpDown } from 'lucide-react';

export function UserSwitcher() {
  const { user, setUser } = useUser();

  const handleValueChange = (userId: string) => {
    const selectedUser = users.find((u) => u.id === userId);
    if (selectedUser) {
      setUser(selectedUser);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <p className="text-sm text-muted-foreground hidden md:block">Simula come:</p>
      <Select value={user.id} onValueChange={handleValueChange}>
        <SelectTrigger className="w-auto border-none shadow-none focus:ring-0 gap-2 bg-transparent">
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
          {users.map((u) => (
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
  );
}
