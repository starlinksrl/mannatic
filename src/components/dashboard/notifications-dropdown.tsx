'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { notifications as allNotifications } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

export function NotificationsDropdown() {
  const { user } = useUser();
  
  if (!user) return null;

  const userNotifications = allNotifications.filter(n => n.userId === user.id || user.role === 'Admin');
  const unreadCount = userNotifications.filter(n => !n.read).length;

  const getIcon = (message: string) => {
    if (message.toLowerCase().includes('scadenza')) return <Info className="h-4 w-4 text-blue-500" />;
    if (message.toLowerCase().includes('rischio')) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    if (message.toLowerCase().includes('completato')) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Bell className="h-4 w-4 text-gray-500" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0">{unreadCount}</Badge>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifiche</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userNotifications.length > 0 ? (
          userNotifications.slice(0, 5).map(notification => (
            <DropdownMenuItem key={notification.id} className={`flex items-start gap-3 ${!notification.read ? 'font-semibold' : ''}`}>
              {getIcon(notification.message)}
              <div className="flex-1">
                <p className="text-sm whitespace-normal">{notification.message}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: it })}</p>
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem>Nessuna notifica</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
