'use client';

import { useState, useEffect } from 'react';

/**
 * Hook che rileva se l'applicazione è in esecuzione all'interno della
 * WebView dell'applicazione Android nativa (APK MannaTic).
 * 
 * Rileva:
 * 1. La presenza del bridge JavaScript iniettato `window.AndroidApp`
 * 2. La presenza del token `MannaTicApp` nello User-Agent impostato in MainActivity.java
 */
export function useIsNativeApp(): boolean {
  const [isNative, setIsNative] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const check = () => {
      const hasAndroidBridge = typeof window !== 'undefined' && Boolean((window as any).AndroidApp);
      const hasAppUserAgent = typeof navigator !== 'undefined' && /MannaTicApp/i.test(navigator.userAgent || '');
      return hasAndroidBridge || hasAppUserAgent;
    };

    if (check()) {
      setIsNative(true);
    } else {
      // Breve retry per scenari in cui il bridge Android viene iniettato asincronamente
      const timer = setTimeout(() => {
        if (check()) {
          setIsNative(true);
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, []);

  return isNative;
}

/**
 * Determina se mostrare il tasto/icona di download dell'APK Android.
 * 
 * Regole rigorose:
 * - Se si naviga da PC / Mac / Desktop -> FALSE (eliminato, non serve su computer)
 * - Se si è già all'interno dell'App Android nativa (APK) -> FALSE (eliminato, già installata)
 * - Se si naviga da browser web su dispositivo Android -> TRUE
 */
export function useShouldShowApkDownload(): boolean {
  const [shouldShow, setShouldShow] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    const check = () => {
      const ua = navigator.userAgent || '';
      const hasAndroidBridge = Boolean((window as any).AndroidApp);
      const hasAppUserAgent = /MannaTicApp/i.test(ua);
      const isNative = hasAndroidBridge || hasAppUserAgent;

      // Se è già l'app nativa, non mostrare mai
      if (isNative) return false;

      // Mostra SOLO se il dispositivo è Android (smartphone o tablet)
      const isAndroid = /android/i.test(ua);
      return isAndroid;
    };

    setShouldShow(check());

    // Controllo ritardato in caso di iniezione asincrona del bridge
    const timer = setTimeout(() => {
      setShouldShow(check());
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  return shouldShow;
}
