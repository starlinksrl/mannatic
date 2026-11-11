'use client';

import React from 'react';
import { useTheme } from '@/contexts/theme-context';
import { FontSize } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Smartphone, Type, ZoomIn, ZoomOut, MapPin, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FontSizeOption {
  id: FontSize;
  label: string;
  scale: string;
  badge: string;
  description: string;
  recommendedFor?: string;
}

const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  {
    id: 'xs',
    label: 'Molto Piccolo',
    scale: '68%',
    badge: 'Massima Riduzione (-32%)',
    description: 'Riduzione ultra incisiva: perfetta su smartphone con caratteri grandi di sistema per azzerare testi tagliati o sovrapposti.',
    recommendedFor: 'Smartphone',
  },
  {
    id: 'sm',
    label: 'Compatto',
    scale: '80%',
    badge: 'Consigliato Mobile (-20%)',
    description: 'Riduzione bilanciata per smartphone: card, tabelle, badge e pulsanti perfettamente ordinati e compatti.',
    recommendedFor: 'Smartphone',
  },
  {
    id: 'md',
    label: 'Normale',
    scale: '100%',
    badge: 'Standard',
    description: 'Dimensione predefinita standard. Ottimale per schermi desktop e laptop.',
    recommendedFor: 'Desktop',
  },
  {
    id: 'lg',
    label: 'Grande',
    scale: '115%',
    badge: 'Ingrandito (+15%)',
    description: 'Caratteri ingranditi per favorire una lettura rilassata da schermi ampi o tablet.',
    recommendedFor: 'Desktop / Tablet',
  },
];

const ORDER: FontSize[] = ['xs', 'sm', 'md', 'lg'];

export function FontSizeSelector({ className }: { className?: string }) {
  const { fontSize, setFontSize } = useTheme();

  const currentIndex = ORDER.indexOf(fontSize);
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < ORDER.length - 1;

  const handleDecrease = () => {
    if (canDecrease) {
      setFontSize(ORDER[currentIndex - 1]);
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      setFontSize(ORDER[currentIndex + 1]);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Stepper Bar */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 border">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Scala Rapida:</span>
          <Badge variant="outline" className="font-mono text-xs">
            {FONT_SIZE_OPTIONS.find((o) => o.id === fontSize)?.scale || '100%'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDecrease}
            disabled={!canDecrease}
            className="h-8 px-2.5 flex items-center gap-1"
            title="Riduci caratteri (A-)"
          >
            <ZoomOut className="h-3.5 w-3.5" />
            <span className="font-bold text-xs">A-</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleIncrease}
            disabled={!canIncrease}
            className="h-8 px-2.5 flex items-center gap-1"
            title="Ingrandisci caratteri (A+)"
          >
            <span className="font-bold text-xs">A+</span>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {FONT_SIZE_OPTIONS.map((opt) => {
          const isSelected = fontSize === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFontSize(opt.id)}
              className={cn(
                'relative flex flex-col text-left p-3 rounded-lg border transition-all',
                'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                  : 'border-border bg-card'
              )}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-medium text-sm flex items-center gap-1.5">
                  {opt.label}
                  <span className="text-xs text-muted-foreground font-mono">({opt.scale})</span>
                </span>
                {isSelected ? (
                  <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full border border-muted-foreground/30" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-snug">{opt.description}</p>
              {opt.badge && (
                <div className="mt-2">
                  <Badge variant={isSelected ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 h-4">
                    {opt.badge}
                  </Badge>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Real-time Live Preview Card */}
      <div className="space-y-1.5 pt-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Anteprima in tempo reale
        </span>
        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs border border-amber-500/30">
                In Lavorazione
              </Badge>
              <span className="text-xs text-muted-foreground">Oggi, 15:30</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm leading-snug flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Manutenzione Impianto #1042</span>
              </h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">Via Roma 12, Milano · Rossi Impianti S.r.l.</span>
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <span className="text-[11px] text-muted-foreground italic">
                Regola i tasti sopra per vedere come questo testo si adatta al tuo schermo.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface FontSizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FontSizeDialog({ open, onOpenChange }: FontSizeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Dimensione Caratteri</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Regola la grandezza dei testi per smartphone o schermi compatti
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <FontSizeSelector className="pt-2" />

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Chiudi e Applica
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
