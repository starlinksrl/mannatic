'use client';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Loader } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
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
    <div className="grid min-h-screen w-full md:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <SidebarNav />
      </div>
      <div className="flex flex-col">
        {children}
      </div>
    </div>
  );
}
