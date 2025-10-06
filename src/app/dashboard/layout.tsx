
'use client';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Loader } from 'lucide-react';
import { InterventionModalProvider } from '@/contexts/intervention-modal-context';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { changelog } from '@/lib/changelog';
import { MapsProvider } from '@/contexts/maps-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, currentCompany } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return; // Wait for the initial loading to complete
    }

    if (!user) {
      router.push('/login');
      return;
    }

    // If a non-creator user somehow ends up without a company, redirect.
    if (user.role !== 'Creator' && !currentCompany) {
      router.push('/login');
    }
  }, [user, isLoading, router, currentCompany]);

  if (isLoading || !user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  const latestVersion = changelog[0]?.version;

  return (
    <MapsProvider>
      <InterventionModalProvider>
        <div className="grid min-h-screen w-full md:grid-cols-[280px_1fr]">
          <div className="hidden border-r bg-card md:block">
            <SidebarNav />
          </div>
          <div className="flex flex-col">
            {children}
          </div>
        </div>
        {latestVersion && (
            <Link href="/dashboard/changelog">
              <Badge 
                variant="secondary" 
                className="fixed bottom-4 right-4 z-50 cursor-pointer hover:ring-2 hover:ring-ring"
              >
                v{latestVersion}
              </Badge>
            </Link>
        )}
      </InterventionModalProvider>
    </MapsProvider>
  );
}
