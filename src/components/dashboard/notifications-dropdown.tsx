
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
import { Bell, AlertTriangle, CheckCircle, Info, LifeBuoy } from 'lucide-react';
import { getNotifications, markNotificationsAsRead, markNotificationAsRead } from '@/lib/data';
import { useUser } from '@/contexts/user-context';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { Notification } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useRouter } from 'next/navigation';

export function NotificationsDropdown() {
  const { user, currentCompany } = useUser();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);
  
  const fetchNotifications = useCallback(async (isInitial = false) => {
    if (!user || !currentCompany) {
      if (isInitial) setLoading(false);
      return;
    }
    if (isInitial) setLoading(true);
    try {
      const userNotifications = await getNotifications(user.id, currentCompany.id);

      if (isFirstFetchRef.current) {
        userNotifications.forEach(n => seenNotificationIdsRef.current.add(n.id));
        isFirstFetchRef.current = false;
      } else {
        const newlyArrived = userNotifications.filter(n => !n.read && !seenNotificationIdsRef.current.has(n.id));
        if (newlyArrived.length > 0) {
          newlyArrived.forEach(n => {
            seenNotificationIdsRef.current.add(n.id);

            const isTicket = n.type === 'support_ticket' || n.message.toLowerCase().includes('ticket');
            const targetUrl = isTicket
              ? (user?.role === 'Client' ? '/dashboard/requests' : '/dashboard/support')
              : '/dashboard/interventions';

            if (typeof window !== 'undefined' && (window as any).AndroidApp?.showNotification) {
              (window as any).AndroidApp.showNotification(
                isTicket ? 'MannaTic: Assistenza' : 'MannaTic: Aggiornamento',
                n.message,
                targetUrl
              );
            } else if (typeof window !== 'undefined' && 'Notification' in window && (window as any).Notification.permission === 'granted') {
              try {
                new (window as any).Notification('MannaTic', {
                  body: n.message,
                  icon: '/icon-192.png',
                });
              } catch (e) {}
            }
          });
        }
      }

      setNotifications(userNotifications);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [user, currentCompany]);

  useEffect(() => {
    fetchNotifications(true);

    // Polling automatico ogni 15 secondi per notifiche in tempo reale
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);
  
  const markAllAsRead = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (user) {
      await markNotificationsAsRead(user.id, unreadIds);
    }
  };

  const handleOpenChange = async (isOpen: boolean) => {
    if (isOpen) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
        if (user) {
          await markNotificationsAsRead(user.id, unreadIds);
        }
      }
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      await markNotificationAsRead(notification.id);
    }

    if (notification.type === 'support_ticket' || notification.message.toLowerCase().includes('ticket')) {
      if (user?.role === 'Client') {
        router.push('/dashboard/requests');
      } else {
        router.push('/dashboard/support');
      }
    } else {
      router.push('/dashboard/interventions');
    }
  };

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (notification: Notification) => {
    const msg = notification.message.toLowerCase();
    if (notification.type === 'support_ticket' || msg.includes('ticket')) return <LifeBuoy className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />;
    if (msg.includes('scadenza')) return <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
    if (msg.includes('rischio')) return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />;
    if (msg.includes('completato')) return <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
    return <Bell className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />;
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0 text-[10px] animate-pulse">{unreadCount}</Badge>
          )}
          <span className="sr-only">Notifiche</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 max-h-[80vh] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifiche</span>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{unreadCount} non lett{unreadCount > 1 ? 'e' : 'a'}</Badge>
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline font-normal cursor-pointer"
              >
                Segna lette
              </button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
            <div className="p-2 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        ) : notifications.length > 0 ? (
          notifications.slice(0, 8).map(notification => (
            <DropdownMenuItem 
              key={notification.id} 
              onClick={() => handleNotificationClick(notification)}
              className={`flex items-start gap-3 p-3 cursor-pointer ${!notification.read ? 'bg-primary/5 font-semibold' : ''}`}
            >
              {getIcon(notification)}
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-normal break-words leading-tight">{notification.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: it })}</p>
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">Nessuna notifica presente</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
