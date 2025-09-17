
'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Company, addCompany, getCompanies } from '@/lib/data';
import { Loader, PlusCircle, Building, Mail, Phone, KeyRound } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
    name: z.string().min(1, { message: 'Il nome è obbligatorio' }),
    address: z.string().optional(),
    vatNumber: z.string().optional(),
    taxCode: z.string().optional(),
    phone: z.string().optional(),
    uniqueCode: z.string().optional(),
    email: z.string().email({ message: 'Email non valida' }),
    password: z.string().min(8, { message: 'La password deve contenere almeno 8 caratteri' })
});


export default function CompaniesPage() {
    const { user, switchCompany } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            address: '',
            vatNumber: '',
            taxCode: '',
            phone: '',
            uniqueCode: '',
            email: '',
            password: ''
        },
    });

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

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const newCompany = await addCompany(values);
        setCompanies(prev => [...prev, newCompany]);
        toast({ title: 'Azienda creata', description: `L'azienda "${values.name}" è stata creata.` });
        form.reset();
        setIsDialogOpen(false);
    }
    
    const handleCompanyClick = (companyId: string) => {
        switchCompany(companyId);
        router.push('/dashboard');
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
                        <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] p-0">
                             <DialogHeader className="p-6 pb-0">
                                <DialogTitle>Crea una nuova azienda</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-full">
                                <div className="p-6">
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} id="add-company-form" className="space-y-4">
                                       <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Nome Azienda</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nome della nuova azienda" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="address"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Indirizzo</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Via, Città, CAP" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <FormField
                                                control={form.control}
                                                name="vatNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>Partita IVA</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="IT..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                             <FormField
                                                control={form.control}
                                                name="taxCode"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>Codice Fiscale</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Codice fiscale..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>Telefono</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Numero di telefono" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="uniqueCode"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>Codice Univoco</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Codice SDI" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>Email (per login admin)</FormLabel>
                                                    <FormControl>
                                                        <Input type="email" placeholder="admin@azienda.com" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                             <FormField
                                                control={form.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>Password (per login admin)</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </form>
                                </Form>
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-6 pt-0">
                                <DialogClose asChild>
                                    <Button variant="outline">Annulla</Button>
                                </DialogClose>
                                <Button type="submit" form="add-company-form">Crea</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {companies.map(company => (
                        <Card key={company.id} className="flex flex-col cursor-pointer hover:bg-muted/50" onClick={() => handleCompanyClick(company.id)}>
                            <CardHeader className="flex-row items-start gap-4 space-y-0">
                                <div className="space-y-1">
                                    <CardTitle>{company.name}</CardTitle>
                                    <CardDescription>{company.address}</CardDescription>
                                </div>
                                <Building className="h-8 w-8 text-muted-foreground ml-auto" />
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-muted-foreground mt-auto">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4"/>
                                    <span>{company.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4"/>
                                    <span>{company.phone}</span>
                                </div>
                            </CardContent>
                             <CardFooter>
                                <p className="text-xs text-muted-foreground">P.IVA: {company.vatNumber}</p>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </main>
        </>
    );
}
