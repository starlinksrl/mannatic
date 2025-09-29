

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
  Building,
  ClipboardCheck,
  Contact,
  Database,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../icons/logo';
import Image from 'next/image';
import { AllowedSector } from '@/lib/types';

const navItems: {
    href: string;
    label: string;
    icon: React.ElementType;
    roles: ('Creator' | 'Admin' | 'Operator' | 'Client')[];
    sector?: AllowedSector;
}[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Operator', 'Client'] },
  { href: '/dashboard/interventions', label: 'Interventi', icon: Wrench, roles: ['Admin', 'Operator', 'Client'], sector: 'interventions' },
  { href: '/dashboard/surveys', label: 'Sopralluoghi', icon: ClipboardCheck, roles: ['Admin', 'Operator'], sector: 'surveys' },
  { href: '/dashboard/maintenance', label: 'Manutenzioni', icon: ShieldCheck, roles: ['Admin', 'Operator'], sector: 'maintenance' },
  { href: '/dashboard/calendar', label: 'Calendario', icon: Calendar, roles: ['Admin', 'Operator'] },
  { href: '/dashboard/requests', label: 'Le mie Richieste', icon: ClipboardList, roles: ['Client'] },
  { href: '/dashboard/users', label: 'Utenti', icon: Users, roles: ['Admin', 'Creator'] },
  { href: '/dashboard/clients', label: 'Clienti', icon: Contact, roles: ['Admin', 'Creator'] },
  { href: '/dashboard/companies', label: 'Aziende', icon: Building, roles: ['Creator'] },
  { href: '/dashboard/explorer', label: 'Explorer', icon: Database, roles: ['Creator'] },
  { href: '/dashboard/admin-explorer', label: 'Explorer', icon: Database, roles: ['Admin'] },
  { href: '/dashboard/info', label: 'Info', icon: Info, roles: ['Creator'] },
  { href: '/dashboard/settings', label: 'Impostazioni', icon: Settings, roles: ['Admin'] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user, currentCompany } = useUser();

  if (!user) return null;
  
  const userCanSeeItem = (item: typeof navItems[0]) => {
    if (!item.roles.includes(user.role)) {
        return false;
    }
    if (user.role === 'Operator') {
        // If it's a sector-specific item, check permissions
        if (item.sector) {
            return user.allowedSectors?.includes(item.sector) ?? true;
        }
    }
    // For non-operators or non-sector items, role-based access is enough
    return true;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="h-16 flex items-center px-6 border-b">
        {currentCompany?.logoUrl ? (
          <div className="flex items-center gap-2">
            <Image src={currentCompany.logoUrl} alt={currentCompany.name} width={32} height={32} className="rounded-md object-contain" />
            <span className="font-headline text-lg font-bold text-foreground">{currentCompany.name}</span>
          </div>
        ) : (
          <Logo />
        )}
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) =>
          userCanSeeItem(item) ? (
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

    