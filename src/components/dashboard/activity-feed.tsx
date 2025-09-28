
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InterventionUpdate } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { MessageSquarePlus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

type EnrichedUpdate = InterventionUpdate & { interventionTitle: string; interventionId: string };

interface ActivityFeedProps {
    updates: EnrichedUpdate[];
}

export function ActivityFeed({ updates }: ActivityFeedProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Attività Recenti</CardTitle>
                <CardDescription>Ultimi aggiornamenti dagli interventi.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[calc(100vh-20rem)]">
                    <div className="space-y-6 pr-4">
                        {updates.length > 0 ? (
                            updates.map((update, index) => (
                                <div key={index} className="flex items-start gap-4 text-sm">
                                    <MessageSquarePlus className="w-5 h-5 mt-1 text-muted-foreground shrink-0" />
                                    <div className="flex-1">
                                        <p className="font-medium">{update.userName}</p>
                                        <p className="text-muted-foreground">{update.description}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            su <span className="font-semibold">{update.interventionTitle}</span>
                                            {' - '}
                                            {formatDistanceToNow(new Date(update.date), { addSuffix: true, locale: it })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Nessuna attività recente.</p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
