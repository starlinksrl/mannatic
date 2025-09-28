
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

type EnrichedUpdate = InterventionUpdate & { interventionTitle: string; interventionId: string };

interface ActivityFeedProps {
    interventions: Intervention[];
    onUpdate: () => void;
}

export function ActivityFeed({ interventions: initialInterventions, onUpdate }: ActivityFeedProps) {
    const { user } = useUser();
    const { openModal } = useInterventionModal();
    const [interventions, setInterventions] = useState(initialInterventions);
    
    useEffect(() => {
        setInterventions(initialInterventions);
    }, [initialInterventions]);

    const latestUpdates = useMemo(() => {
        return interventions
            .flatMap(i => (i.updates || []).map(u => ({ 
                ...u, 
                interventionTitle: i.title,
                interventionId: i.id 
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
                <CardDescription>Ultimi aggiornamenti dagli interventi.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[calc(100vh-20rem)]">
                    <div className="space-y-6 pr-4">
                        {latestUpdates.length > 0 ? (
                            latestUpdates.map((update, index) => {
                                const isUnread = !update.readBy?.includes(user.id);
                                return (
                                    <div 
                                        key={index} 
                                        className="flex items-start gap-4 text-sm cursor-pointer"
                                        onClick={() => handleUpdateClick(update)}
                                    >
                                        <MessageSquarePlus className={cn("w-5 h-5 mt-1 shrink-0", isUnread ? 'text-red-500' : 'text-muted-foreground')} />
                                        <div className="flex-1">
                                            <p className={cn("font-medium", isUnread && "text-red-500")}>{update.userName}</p>
                                            <p className="text-muted-foreground">{update.description}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                su <span className="font-semibold">{update.interventionTitle}</span>
                                                {' - '}
                                                {formatDistanceToNow(new Date(update.date), { addSuffix: true, locale: it })}
                                            </p>
                                        </div>
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
