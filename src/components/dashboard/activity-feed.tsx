

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
    onUpdate: () => void;
}

export function ActivityFeed({ interventions, onUpdate }: ActivityFeedProps) {
    const { user } = useUser();
    const { openModal } = useInterventionModal();
    
    const latestUpdates = useMemo(() => {
        const clientsMap = new Map(interventions.map(i => [i.id, i.clientId]));
        
        return interventions
            .flatMap(i => (i.updates || []).map(u => ({ 
                ...u, 
                interventionTitle: i.title,
                interventionId: i.id,
                clientName: interventions.find(c => c.id === i.id)?.clientId // This is wrong, need to map client
            } as EnrichedUpdate)))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 15);
    }, [interventions]);

    if (!user) return null;

    const handleUpdateClick = async (update: EnrichedUpdate) => {
        const targetIntervention = interventions.find(i => i.id === update.interventionId);
        if (targetIntervention) {
            openModal(targetIntervention);
            
            if (!update.readBy?.includes(user.id)) {
                 await markInterventionUpdateAsRead(update.interventionId, update.date, user.id);
                 onUpdate(); // Re-fetch data to get the latest read status
            }
        }
    };
    

    return (
        <Card>
            <CardHeader>
                <CardTitle>Attività Recenti</CardTitle>
                <CardDescription>Ultimi aggiornamenti dagli interventi. Clicca su un elemento per vederne i dettagli.</CardDescription>
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
                                       {update.clientName && <p className="text-xs text-muted-foreground">{update.clientName}</p>}
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
