

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

const navItems: {
    href: string;
    label: string;
    icon: React.ElementType;
    roles: ('Creator' | 'Admin' | 'Operator' | 'Client')[];
    creatorType?: 'main' | 'regular'; // Specify which type of creator can see it
    sector?: AllowedSector;
}[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Operator', 'Client', 'Creator'], creatorType: 'regular' },
  { href: '/dashboard/interventions', label: 'Interventi', icon: Wrench, roles: ['Admin', 'Operator', 'Client'], sector: 'interventions' },
  { href: '/dashboard/new-installations', label: 'Nuovi Impianti', icon: HardHat, roles: ['Admin', 'Operator'], sector: 'interventions' },
  { href: '/dashboard/surveys', label: 'Appuntamenti', icon: ClipboardCheck, roles: ['Admin', 'Operator'], sector: 'surveys' },
  { href: '/dashboard/maintenance', label: 'Manutenzioni', icon: ShieldCheck, roles: ['Admin', 'Operator'], sector: 'maintenance' },
  { href: '/dashboard/support', label: 'Supporto', icon: LifeBuoy, roles: ['Admin', 'Client'] },
  { href: '/dashboard/map', label: 'Mappa', icon: Map, roles: ['Admin', 'Operator'] },
  { href: '/dashboard/calendar', label: 'Calendario', icon: Calendar, roles: ['Admin', 'Operator'] },
  { href: '/dashboard/users', label: 'Utenti', icon: Users, roles: ['Admin', 'Creator'] },
  { href: '/dashboard/clients', label: 'Clienti', icon: Contact, roles: ['Admin', 'Creator'], creatorType: 'regular' },
  { href: '/dashboard/companies', label: 'Aziende', icon: Building, roles: ['Creator'], creatorType: 'regular' },
  { href: '/dashboard/creator-settings', label: 'App Config', icon: Settings, roles: ['Creator'], creatorType: 'main' },
  { href: '/dashboard/explorer', label: 'Explorer', icon: Database, roles: ['Creator'], creatorType: 'main' },
  { href: '/dashboard/info', label: 'Info', icon: Info, roles: ['Creator'], creatorType: 'main' },
  { href: '/dashboard/manual', label: 'Manuale', icon: HelpCircle, roles: ['Operator', 'Client'] },
  { href: '/dashboard/settings', label: 'Impostazioni', icon: Settings, roles: ['Admin'] },
  { href: '/dashboard/changelog', label: 'Changelog', icon: GitMerge, roles: ['Operator', 'Client', 'Creator'] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user, currentCompany } = useUser();

  if (!user) return null;
  
  const userCanSeeItem = (item: typeof navItems[0]) => {
    if (!item.roles.includes(user.role)) {
        return false;
    }
    
    if (user.role === 'Creator') {
        const isMain = isMainCreator(user);

        // If a creator type is specified, check if the user matches
        if (item.creatorType) {
            if (isMain && item.creatorType !== 'main') return false;
            if (!isMain && item.creatorType !== 'regular') return false;
        }

        // Logic for impersonation vs global view
        if (currentCompany) { // Impersonating a company
            const disallowedRoutesForImpersonation = ['/dashboard/companies', '/dashboard/explorer', '/dashboard/info', '/dashboard/creator-settings'];
            if(disallowedRoutesForImpersonation.includes(item.href)) return false;
            // The item must not be 'main' creator specific when impersonating
            return item.creatorType !== 'main';
        } else { // Global view
             if (isMain) {
                // Main creator in global view only sees main creator items
                return item.creatorType === 'main';
             } else {
                 // Regular creator in global view sees their company list
                 return item.href === '/dashboard/companies';
             }
        }
    }

    if (user.role === 'Operator') {
        if (item.sector) {
            return user.allowedSectors?.includes(item.sector) ?? true;
        }
    }
    
    return true;
  }
  
  const latestVersion = changelog[0]?.version;

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
                pathname === item.href ? 'bg-muted text-primary' : '',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
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
                        v{latestVersion}
                    </Badge>
                </Link>
            </div>
        )}
      </div>
    </div>
  );
}

