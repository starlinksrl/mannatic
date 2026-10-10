'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
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
  const [isDismissed, setIsDismissed] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [supported, setSupported] = useState(true);

  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user previously dismissed banner in this browser/session
    try {
      if (localStorage.getItem('mannatic_notif_banner_dismissed') === 'true') {
        setIsDismissed(true);
        return;
      }
    } catch (e) {}

    const checkAndroid = Boolean((window as any).AndroidApp) || navigator.userAgent.includes('MannaTicApp');
    setIsAndroid(checkAndroid);

    if (checkAndroid) {
      const permitted = (window as any).AndroidApp?.hasNotificationPermission?.() || false;
      if (permitted) {
        setHasPermission(true);
      }
      return;
    }

    // Web browser checks
    const hasWebNotification = 'Notification' in window;
    const hasServiceWorker = 'serviceWorker' in navigator;
    if (!hasWebNotification || !hasServiceWorker) {
      // Not supported in this browser, hide banner silently
      setSupported(false);
      return;
    }

    if (Notification.permission === 'granted') {
      setHasPermission(true);
    } else if (Notification.permission === 'denied') {
      setIsDismissed(true);
    }

    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) {
          setIsSubscribed(true);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, [user]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('mannatic_notif_banner_dismissed', 'true');
    } catch (e) {}
  };

  const subscribeWebUser = async () => {
    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID public key not found');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      if (user) {
        const result = await savePushSubscription(user.id, sub.toJSON() as any);
        if (result.success) {
          setIsSubscribed(true);
          toast({ title: 'Notifiche abilitate!', description: 'Riceverai notifiche su questo dispositivo.' });
        }
      }
    } catch (error) {
      console.error('Failed to subscribe the user: ', error);
    }
  };

  const handleRequestPermission = async () => {
    if (isAndroid) {
      const androidApp = (window as any).AndroidApp;
      if (androidApp?.requestNotificationPermission) {
        // Register callback for Android 13+ prompt result
        (window as any).onNotificationPermissionResult = (granted: boolean) => {
          if (granted) {
            setHasPermission(true);
            toast({
              title: 'Notifiche abilitate!',
              description: "Riceverai le notifiche dell'app direttamente sul tuo dispositivo.",
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Permesso non concesso',
              description: "Puoi abilitare le notifiche nelle impostazioni del telefono.",
            });
          }
        };

        androidApp.requestNotificationPermission();

        // Fallback check after 1s (e.g. Android 12 where permission is already granted)
        setTimeout(() => {
          if (androidApp.hasNotificationPermission && androidApp.hasNotificationPermission()) {
            setHasPermission(true);
            toast({
              title: 'Notifiche abilitate!',
              description: "Riceverai le notifiche dell'app direttamente sul tuo dispositivo.",
            });
          }
        }, 1000);
      } else {
        setHasPermission(true);
      }
      return;
    }

    // Standard web browser flow
    if (!('Notification' in window)) {
      setSupported(false);
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setHasPermission(true);
        await subscribeWebUser();
      } else {
        toast({
          variant: 'destructive',
          title: 'Permesso negato',
          description: 'Devi abilitare le notifiche nelle impostazioni del browser.',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isDismissed || !supported || hasPermission || isSubscribed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="bg-background border rounded-lg p-4 shadow-lg flex items-center gap-3 max-w-sm">
        <Bell className="h-6 w-6 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Abilita Notifiche</p>
          <p className="text-xs text-muted-foreground">Ricevi avvisi per nuovi interventi e ticket.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" onClick={handleRequestPermission}>Abilita</Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleDismiss}>
            <X className="h-4 w-4" />
            <span className="sr-only">Chiudi</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
