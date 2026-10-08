

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Intervention, InterventionUpdate, User } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { MessageSquarePlus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useUser } from '@/contexts/user-context';
import { useState, useMemo, useEffect } from 'react';
import { markInterventionUpdateAsRead } from '@/lib/data';
import { useInterventionModal } from '@/contexts/intervention-modal-context';
import { cn } from '@/lib/utils';
import { EnrichedUpdate } from '@/app/dashboard/page';

interface ActivityFeedProps {
    interventions: Intervention[];
    latestUpdates: EnrichedUpdate[];
    onUpdate: () => void;
    className?: string;
}

export function ActivityFeed({ interventions, latestUpdates, onUpdate, className }: ActivityFeedProps) {
    const { user } = useUser();
    const { openModal } = useInterventionModal();

    if (!user) return null;

    const handleUpdateClick = async (update: EnrichedUpdate) => {
        const targetIntervention = interventions.find(i => i.id === update.interventionId);
        if (targetIntervention) {
            openModal(targetIntervention);
            
            if (!update.readBy?.includes(user.id)) {
                 await markInterventionUpdateAsRead(update.interventionId, user.id);
                 onUpdate(); // Re-fetch data to get the latest read status
            }
        }
    };
    

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Attività Recenti</CardTitle>
                <CardDescription>Ultimi aggiornamenti dagli interventi.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    <div className="space-y-4 pr-4">
                        {latestUpdates.length > 0 ? (
                            latestUpdates.map((update, index) => {
                                const isUnread = !update.readBy?.includes(user.id);
                                return (
                                    <div 
                                        key={index} 
                                        className="text-sm cursor-pointer group"
                                        onClick={() => handleUpdateClick(update)}
                                    >
                                       <p className={cn("font-semibold group-hover:underline", isUnread ? 'text-red-500' : 'text-foreground')}>{update.interventionTitle}</p>
                                       <p className="text-xs text-muted-foreground">{update.clientName}</p>
                                       <p className="text-muted-foreground truncate">{update.description}</p>
                                       <p className="text-xs text-muted-foreground mt-1">
                                            da <span className="font-medium">{update.userName}</span>
                                            {' - '}
                                            {formatDistanceToNow(new Date(update.date), { addSuffix: true, locale: it })}
                                        </p>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Nessuna attività recente.</p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
