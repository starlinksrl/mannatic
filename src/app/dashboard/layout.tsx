
'use client';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Loader } from 'lucide-react';
import { InterventionModalProvider } from '@/contexts/intervention-modal-context';
import { MapsProvider } from '@/contexts/maps-context';
import { ChangelogModal } from '@/components/dashboard/changelog-modal';
import { NotificationManager } from '@/components/dashboard/notification-manager';

import { SupportUpdateBanner } from '@/components/dashboard/support-update-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, currentCompany } = useUser();
  const router = useRouter();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('Service Worker registration failed:', err));
    }
  }, []);

  useEffect(() => {
    if (isLoading) {
      return; // Wait for the initial loading to complete
    }

    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  return (
    <MapsProvider>
      <InterventionModalProvider>
        <div className="grid min-h-screen w-full md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="hidden border-r bg-card md:block">
            <SidebarNav />
          </div>
          <div className="flex flex-col min-w-0 overflow-x-hidden">
            <SupportUpdateBanner />
            {children}
          </div>
        </div>
        <NotificationManager />
        <ChangelogModal />
      </InterventionModalProvider>
    </MapsProvider>
  );
}
