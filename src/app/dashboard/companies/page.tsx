
'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Company, getCompanies, addCompany } from '@/lib/data';
import { Loader, PlusCircle, Building } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';


export default function CompaniesPage() {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');

    useEffect(() => {
        if(user && user.role !== 'Creator') {
            router.push('/dashboard');
        }

        async function fetchCompanies() {
            setIsLoading(true);
            const comps = await getCompanies();
            setCompanies(comps);
            setIsLoading(false);
        }

        if (user) {
            fetchCompanies();
        }
    }, [user, router]);

    const handleAddCompany = async () => {
        if (newCompanyName.trim() === '') {
            toast({ variant: 'destructive', title: 'Il nome non può essere vuoto' });
            return;
        }
        const newCompany = await addCompany(newCompanyName);
        setCompanies(prev => [...prev, newCompany]);
        toast({ title: 'Azienda creata', description: `L'azienda "${newCompanyName}" è stata creata.` });
        setNewCompanyName('');
        setIsDialogOpen(false);
    }

    if (isLoading || !user) {
        return (
            <>
                <Header title="Aziende" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

    if (user.role !== 'Creator') {
        return null;
    }

    return (
        <>
            <Header title="Gestione Aziende" />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="flex justify-end mb-4">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2" />
                                Crea Azienda
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Crea una nuova azienda</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Nome
                                </Label>
                                <Input
                                    id="name"
                                    value={newCompanyName}
                                    onChange={(e) => setNewCompanyName(e.target.value)}
                                    className="col-span-3"
                                    placeholder="Nome della nuova azienda"
                                />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Annulla</Button>
                                </DialogClose>
                                <Button onClick={handleAddCompany}>Crea</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {companies.map(company => (
                        <Card key={company.id}>
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <Building className="h-8 w-8 text-muted-foreground" />
                                <CardTitle>{company.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">ID: {company.id}</p>
                                {/* In a real app, you could show more stats here */}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>
        </>
    );
}

