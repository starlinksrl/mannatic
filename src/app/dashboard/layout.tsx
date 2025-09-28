
'use client';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Loader } from 'lucide-react';
import { InterventionModalProvider } from '@/contexts/intervention-modal-context';

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

  return (
    <InterventionModalProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-card md:block">
          <SidebarNav />
        </div>
        <div className="flex flex-col">
          {children}
        </div>
      </div>
    </InterventionModalProvider>
  );
}
