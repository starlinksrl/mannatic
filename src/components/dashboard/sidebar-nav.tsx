

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
  HardHat,
  GitMerge,
  HelpCircle,
  Map,
  LifeBuoy,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../icons/logo';
import Image from 'next/image';
import { AllowedSector, User as UserType } from '@/lib/types';
import { Separator } from '../ui/separator';
import { changelog } from '@/lib/changelog';
import { Badge } from '../ui/badge';

const isMainCreator = (user: UserType | null) => user?.email === 'creator@mannatic.com';


export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();

  if (!user) return null;
  
  const navItems: {
    href: string;
    label: string;
    mainCreatorLabel?: string;
    icon: React.ElementType;
    roles: ('Creator' | 'Admin' | 'Operator' | 'Client')[];
    sector?: AllowedSector;
    mainCreatorOnly?: boolean;
    regularCreatorOnly?: boolean;
  }[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Operator', 'Client'] },
    { href: '/dashboard/interventions', label: 'Interventi', icon: Wrench, roles: ['Admin', 'Operator', 'Client'], sector: 'interventions' },
    { href: '/dashboard/new-installations', label: 'Nuovi Impianti', icon: HardHat, roles: ['Admin', 'Operator'], sector: 'new_installations' },
    { href: '/dashboard/appointments', label: 'Appuntamenti', icon: ClipboardCheck, roles: ['Admin', 'Operator'], sector: 'appointments' },
    { href: '/dashboard/maintenance', label: 'Manutenzioni', icon: ShieldCheck, roles: ['Admin', 'Operator'], sector: 'maintenance' },
    { href: '/dashboard/support', label: 'Supporto', icon: LifeBuoy, roles: ['Admin', 'Client'] },
    { href: '/dashboard/map', label: 'Mappa', icon: Map, roles: ['Admin', 'Operator'] },
    { href: '/dashboard/calendar', label: 'Calendario', icon: Calendar, roles: ['Admin', 'Operator'] },
    { href: '/dashboard/users', label: 'Utenti', mainCreatorLabel: 'Creators', icon: Users, roles: ['Creator', 'Admin'] },
    { href: '/dashboard/clients', label: 'Clienti', icon: Contact, roles: ['Admin'] },
    { href: '/dashboard/companies', label: 'Aziende', icon: Building, roles: ['Creator'] },
    { href: '/dashboard/creator-settings', label: 'App Config', icon: Settings, roles: ['Creator'], mainCreatorOnly: true },
    { href: '/dashboard/explorer', label: 'Explorer', icon: Database, roles: ['Creator'], mainCreatorOnly: true },
    { href: '/dashboard/info', label: 'Info', icon: Info, roles: ['Creator'], mainCreatorOnly: true },
    { href: '/dashboard/manual', label: 'Manuale', icon: HelpCircle, roles: ['Operator', 'Client'] },
    { href: '/dashboard/settings', label: 'Impostazioni', icon: Settings, roles: ['Admin'] },
    { href: '/dashboard/changelog', label: 'Changelog', icon: GitMerge, roles: ['Operator', 'Client', 'Creator'] },
];

  const userCanSeeItem = (item: typeof navItems[0]) => {
    if (user.role !== 'Creator' && item.roles.includes(user.role)) {
       if (user.role === 'Operator' && item.sector) {
            // An Operator MUST have the specific sector in their allowedSectors array.
            // If allowedSectors is undefined or null, they can't see any sector-specific items.
            return user.allowedSectors?.includes(item.sector) ?? false;
        }
        return true;
    }
    if (user.role === 'Creator') {
        if (!item.roles.includes('Creator')) return false;
        
        const isMain = isMainCreator(user);
        
        // Show item if it's not restricted by creator type
        if (!item.mainCreatorOnly && !item.regularCreatorOnly) {
            return true;
        }

        if (item.mainCreatorOnly) return isMain;
        if (item.regularCreatorOnly) return !isMain;
        
        return true;
    }
    return false;
  }
  
  const latestVersion = changelog[0]?.version;
  const isMain = isMainCreator(user);

  return (
    <div className="flex h-full flex-col">
      <div className="h-16 flex items-center px-6 border-b">
        <Logo />
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) =>
          userCanSeeItem(item) ? (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                pathname === item.href ? 'bg-muted text-primary' : '',
              )}
            >
              <item.icon className="h-4 w-4" />
              {(isMain && item.mainCreatorLabel) ? item.mainCreatorLabel : item.label}
            </Link>
          ) : null
        )}
      </nav>
      <div className="mt-auto p-4 space-y-2">
        <Separator />
        <p className="text-xs text-muted-foreground text-center">
            Created by F. Mannarini on Google Cloud
        </p>
         {latestVersion && (
            <div className="text-center">
                <Link href="/dashboard/changelog">
                    <Badge 
                        variant="secondary" 
                        className="cursor-pointer hover:ring-1 hover:ring-ring"
                    >
                        v{latestVersion} (c461eb7)
                    </Badge>
                </Link>
            </div>
        )}
      </div>
    </div>
  );
}
