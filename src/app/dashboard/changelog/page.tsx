
'use client';

import { Header } from '@/components/dashboard/header';
import { ChangelogDisplay } from '@/components/dashboard/changelog-display';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ChangelogPage() {

    return (
        <>
            <Header title="Changelog" />
            <ScrollArea className="flex-1">
                <main className="p-4 md:p-6 lg:p-8 space-y-8">
                     <ChangelogDisplay />
                </main>
            </ScrollArea>
        </>
    );
}
