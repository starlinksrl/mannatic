

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
  FileText,
  UserCog,
  BarChart3,
  Smartphone,
} from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../icons/logo';
import Image from 'next/image';
import { AllowedSector, User as UserType } from '@/lib/types';
import { Separator } from '../ui/separator';
import { changelog } from '@/lib/changelog';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';

const isMainCreator = (user: UserType | null) => user?.email === 'creator@mannatic.com';
const isDistributor = (user: UserType | null) => user?.role === 'Distributor';
const isDistributorAdmin = (user: UserType | null) => user?.role === 'DistributorAdmin';
const isDistributorUser = (user: UserType | null) => user?.role === 'DistributorUser';

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();

  if (!user) return null;
  
  const navItems: {
    href: string;
    label: string;
    mainCreatorLabel?: string;
    icon: React.ElementType;
    roles: ('Creator' | 'Distributor' | 'Admin' | 'Operator' | 'Client' | 'DistributorAdmin' | 'DistributorUser')[];
    sector?: AllowedSector;
    mainCreatorOnly?: boolean;
    regularCreatorOnly?: boolean;
  }[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Operator', 'Client'] },
    { href: '/dashboard/distributor-dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Distributor'] },
    { href: '/dashboard/operator-dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['DistributorAdmin', 'DistributorUser'] },
    { href: '/dashboard/interventions', label: 'Interventi', icon: Wrench, roles: ['Admin', 'Operator', 'Client'], sector: 'interventions' },
    { href: '/dashboard/new-installations', label: 'Nuovi Impianti', icon: HardHat, roles: ['Admin', 'Operator'], sector: 'new_installations' },
    { href: '/dashboard/appointments', label: 'Appuntamenti', icon: ClipboardCheck, roles: ['Admin', 'Operator'], sector: 'appointments' },
    { href: '/dashboard/maintenance', label: 'Manutenzioni', icon: ShieldCheck, roles: ['Admin', 'Operator'], sector: 'maintenance' },
    { href: '/dashboard/support', label: 'Supporto', icon: LifeBuoy, roles: ['Admin', 'Client', 'Distributor', 'DistributorAdmin', 'DistributorUser'] },
    { href: '/dashboard/quotes', label: 'Preventivi', icon: FileText, roles: ['Admin', 'Distributor', 'DistributorAdmin', 'DistributorUser'] },
    { href: '/dashboard/map', label: 'Mappa', icon: Map, roles: ['Admin', 'Operator'] },
    { href: '/dashboard/calendar', label: 'Calendario', icon: Calendar, roles: ['Admin', 'Operator'] },
    { href: '/dashboard/users', label: 'Utenti', mainCreatorLabel: 'Creators & Distributori', icon: Users, roles: ['Creator', 'Admin'] },
    { href: '/dashboard/clients', label: 'Clienti', icon: Contact, roles: ['Admin'] },
    { href: '/dashboard/companies', label: 'Installatori', icon: Building, roles: ['Creator', 'Distributor'] },
    { href: '/dashboard/operators', label: 'Operatori', icon: UserCog, roles: ['Distributor', 'DistributorAdmin'] },
    { href: '/dashboard/operator-stats', label: 'Statistiche', icon: BarChart3, roles: ['Distributor', 'DistributorAdmin'] },
    { href: '/dashboard/creator-settings', label: 'App Config', icon: Settings, roles: ['Creator'], mainCreatorOnly: true },
    { href: '/dashboard/explorer', label: 'Explorer', icon: Database, roles: ['Creator'], mainCreatorOnly: true },
    { href: '/dashboard/info', label: 'Info', icon: Info, roles: ['Creator'], mainCreatorOnly: true },
    { href: '/dashboard/manual', label: 'Manuale', icon: HelpCircle, roles: ['Operator', 'Client'] },
    { href: '/dashboard/settings', label: 'Impostazioni', icon: Settings, roles: ['Admin'] },
    { href: '/dashboard/changelog', label: 'Changelog', icon: GitMerge, roles: ['Operator', 'Client', 'Creator', 'Distributor', 'DistributorAdmin', 'DistributorUser'] },
];

  const userCanSeeItem = (item: typeof navItems[0]) => {
    // DistributorUser: ONLY support and quotes
    if (user.role === 'DistributorUser') {
      return item.roles.includes('DistributorUser');
    }
    // DistributorAdmin: same visibility as Distributor
    if (user.role === 'DistributorAdmin') {
      return item.roles.includes('DistributorAdmin');
    }
    // Distributor: sees only their allowed pages
    if (user.role === 'Distributor') {
      return item.roles.includes('Distributor');
    }
    if (user.role !== 'Creator' && item.roles.includes(user.role)) {
       if (user.role === 'Operator' && item.sector) {
            return user.allowedSectors?.includes(item.sector) ?? false;
        }
        return true;
    }
    if (user.role === 'Creator') {
        if (!item.roles.includes('Creator')) return false;
        const isMain = isMainCreator(user);
        if (!item.mainCreatorOnly && !item.regularCreatorOnly) return true;
        if (item.mainCreatorOnly) return isMain;
        if (item.regularCreatorOnly) return !isMain;
        return true;
    }
    return false;
  }
  
  const latestEntry = changelog[0];
  const latestVersion = latestEntry?.version;
  const latestDate = latestEntry?.date ? format(new Date(latestEntry.date), 'dd/MM/yyyy') : null;
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
      <div className="mt-auto p-4 space-y-3">
        <a
          href="/mannatic.apk"
          download="mannatic.apk"
          className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          title="Scarica l'app Android per smartphone"
        >
          <Smartphone className="h-5 w-5 shrink-0 text-emerald-500" />
          <div className="flex flex-col text-left leading-tight">
            <span className="text-xs font-semibold">App Android</span>
            <span className="text-[10px] text-muted-foreground">Scarica APK per smartphone</span>
          </div>
        </a>
        <Separator />
        <p className="text-xs text-muted-foreground text-center">
            Created by F. Mannarini on Google Cloud
        </p>
         {latestVersion && (
            <div className="text-center flex justify-between items-center">
                <span/>
                <Link href="/dashboard/changelog">
                    <Badge 
                        variant="secondary" 
                        className="cursor-pointer hover:ring-1 hover:ring-ring"
                    >
                        v{latestVersion}
                    </Badge>
                </Link>
                 <span className="text-xs text-muted-foreground">
                    {latestDate}
                </span>
            </div>
        )}
      </div>
    </div>
  );
}

    