import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
