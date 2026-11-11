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
