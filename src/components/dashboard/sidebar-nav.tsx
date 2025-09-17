'use client';

import { useUser } from '@/contexts/user-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wrench,
  Calendar,
  Users,
  Settings,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../icons/logo';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Operator', 'Client'] },
  { href: '/dashboard/interventions', label: 'Interventi', icon: Wrench, roles: ['Admin', 'Operator', 'Client'] },
  { href: '/dashboard/maintenance', label: 'Manutenzioni', icon: ShieldCheck, roles: ['Admin', 'Operator'] },
  { href: '/dashboard/calendar', label: 'Calendario', icon: Calendar, roles: ['Admin', 'Operator'] },
  { href: '/dashboard/requests', label: 'Le mie Richieste', icon: ClipboardList, roles: ['Client'] },
  { href: '/dashboard/users', label: 'Utenti', icon: Users, roles: ['Admin'] },
  { href: '/dashboard/settings', label: 'Impostazioni', icon: Settings, roles: ['Admin'] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="h-16 flex items-center px-6 border-b">
        <Logo />
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) =>
          item.roles.includes(user.role) ? (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                pathname.startsWith(item.href) && item.href !== '/dashboard' ? 'bg-muted text-primary' : '',
                pathname === item.href && item.href === '/dashboard' ? 'bg-muted text-primary' : '',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ) : null
        )}
      </nav>
    </div>
  );
}
