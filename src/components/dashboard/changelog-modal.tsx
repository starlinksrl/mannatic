'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { changelog } from '@/lib/changelog';
import { useUser } from '@/contexts/user-context';
import { Label } from '../ui/label';

export function ChangelogModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { user } = useUser();

  const latestEntry = changelog[0];
  if (!latestEntry) return null;

  const storageKey = `changelog-dismissed-v${latestEntry.version}`;

  useEffect(() => {
    if (user && (user.role === 'Admin' || user.role === 'Operator')) {
      const isDismissed = localStorage.getItem(storageKey);
      if (!isDismissed) {
        setIsOpen(true);
      }
    }
  }, [user, storageKey]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true');
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <latestEntry.icon className={`h-6 w-6 text-white p-1 rounded-md ${latestEntry.iconClass}`} />
             Novità della versione {latestEntry.version}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <h3 className="font-semibold text-lg">{latestEntry.title}</h3>
            <ul className="space-y-3">
                {latestEntry.changes.map((change, cIndex) => (
                    <li key={cIndex} className="flex items-start gap-3 text-sm">
                        <change.type className="h-4 w-4 mt-0.5 text-primary shrink-0"/>
                        <span className="text-muted-foreground">{change.description}</span>
                    </li>
                ))}
            </ul>
        </div>
        <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label htmlFor="dont-show-again" className="text-sm font-normal">
              Non mostrare più
            </Label>
          </div>
          <Button onClick={handleClose}>Ho capito!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
