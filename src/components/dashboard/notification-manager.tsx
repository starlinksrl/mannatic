
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { savePushSubscription } from '@/app/actions';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationManager() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) {
            setIsSubscribed(true);
            setSubscription(sub);
          }
        });
      });
    }
  }, [user]);

  const subscribeUser = async () => {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      console.error('VAPID public key not found');
      toast({
        variant: 'destructive',
        title: 'Errore di configurazione',
        description: 'La chiave VAPID per le notifiche push non è configurata.',
      });
      return;
    }

    if (Notification.permission === 'denied') {
      toast({
        variant: 'destructive',
        title: 'Permesso negato',
        description: 'Devi abilitare le notifiche nelle impostazioni del browser.',
      });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });

      if (user) {
        const result = await savePushSubscription(user.id, subscription.toJSON());
        if (result.success) {
          setIsSubscribed(true);
          setSubscription(subscription);
          toast({ title: 'Notifiche abilitate!', description: 'Riceverai notifiche su questo dispositivo.' });
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error('Failed to subscribe the user: ', error);
      toast({
        variant: 'destructive',
        title: 'Iscrizione fallita',
        description: 'Impossibile abilitare le notifiche push.',
      });
    }
  };
  
  const handleRequestPermission = () => {
    if (!('Notification' in window)) {
       toast({
        variant: 'destructive',
        title: 'Notifiche non supportate',
        description: 'Il tuo browser non supporta le notifiche push.',
      });
      return;
    }
    
    Notification.requestPermission().then(permission => {
        setPermission(permission);
        if (permission === 'granted') {
            subscribeUser();
        }
    });
  }


  if (user?.role !== 'Admin' || permission !== 'default' || isSubscribed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-background border rounded-lg p-4 shadow-lg flex items-center gap-4">
            <Bell className="h-6 w-6 text-primary" />
            <div>
                <p className="font-semibold">Abilita Notifiche</p>
                <p className="text-sm text-muted-foreground">Ricevi avvisi per nuovi interventi e ticket.</p>
            </div>
            <Button onClick={handleRequestPermission}>Abilita</Button>
        </div>
    </div>
  );
}
