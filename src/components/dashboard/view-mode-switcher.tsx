
'use client';

import { useTheme } from '@/contexts/theme-context';
import { LayoutGrid, Table, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useUser } from '@/contexts/user-context';
import { ViewMode } from '@/lib/types';

export function ViewModeSwitcher() {
  const { user } = useUser();
  const { viewMode, setViewMode } = useTheme();

  const handleSetViewMode = (newMode: ViewMode) => {
    if (user?.role === 'Admin' || user?.role === 'Creator') {
        setViewMode(newMode);
    }
  }

  const modes: { name: ViewMode; label: string; icon: any }[] = [
    { name: 'grid', label: 'Post-it', icon: LayoutGrid },
    { name: 'table', label: 'Tabellare', icon: Table },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      <TooltipProvider>
        {modes.map((m) => (
          <Tooltip key={m.name}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleSetViewMode(m.name)}
                className={cn(
                  'h-12 w-24 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent',
                  viewMode === m.name ? 'border-primary ring-1 ring-primary bg-accent' : 'border-input bg-background'
                )}
                aria-label={`Switch to ${m.label} view`}
                disabled={user?.role !== 'Admin' && user?.role !== 'Creator'}
              >
                <m.icon className={cn("h-5 w-5", viewMode === m.name ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[10px] font-medium", viewMode === m.name ? "text-primary" : "text-muted-foreground")}>
                  {m.label}
                </span>
                {viewMode === m.name && (
                   <div className="absolute top-1 right-1">
                      <Check className="h-3 w-3 text-primary" />
                   </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{m.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
