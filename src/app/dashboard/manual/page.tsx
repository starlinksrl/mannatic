

'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { Loader } from 'lucide-react';
import ManualPageContent from '@/components/dashboard/manual-page-content';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ManualPage() {
    const { isLoading } = useUser();

    if (isLoading) {
        return (
            <>
                <Header title="Manuale Utente" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

    return (
        <>
            <Header title="Manuale Utente" />
            <ScrollArea className="flex-1">
                <main className="p-4 md:p-6 lg:p-8">
                    <ManualPageContent />
                </main>
            </ScrollArea>
        </>
    );
}
