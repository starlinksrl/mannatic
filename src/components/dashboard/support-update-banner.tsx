'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import { getNotifications } from '@/lib/data';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Notification } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function SupportUpdateBanner() {
  const { user, currentCompany } = useUser();
  const [unreadSupportNotifs, setUnreadSupportNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    async function fetchNotifs() {
      if (!user || !currentCompany) return;
      
      const allNotifs = await getNotifications(user.id, currentCompany.id);
      // Find unread notifications about tickets for this user
      const filtered = allNotifs.filter(
        (n) => !n.read && n.message.toLowerCase().includes('ticket')
      );
      setUnreadSupportNotifs(filtered);
    }
    
    fetchNotifs();
    
    // Poll every 30 seconds
    const intervalId = setInterval(fetchNotifs, 30000);
    return () => clearInterval(intervalId);
  }, [user, currentCompany]);

  if (unreadSupportNotifs.length === 0) return null;

  const handleGoToSupport = async () => {
    if (user && unreadSupportNotifs.length > 0) {
      const { markNotificationsAsRead } = await import('@/lib/data');
      const unreadIds = unreadSupportNotifs.map(n => n.id);
      await markNotificationsAsRead(user.id, unreadIds);
      setUnreadSupportNotifs([]);
    }
  };

  return (
    <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between z-50 shadow-sm relative">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span className="font-medium text-sm md:text-base">
          Hai {unreadSupportNotifs.length} aggiornament{unreadSupportNotifs.length > 1 ? 'i' : 'o'} non lett{unreadSupportNotifs.length > 1 ? 'i' : 'o'} sui ticket di supporto.
        </span>
      </div>
      <Button asChild variant="secondary" size="sm" className="shrink-0 text-blue-600 font-semibold hover:bg-blue-50" onClick={handleGoToSupport}>
        <Link href="/dashboard/support">
          Vai ai Ticket <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
