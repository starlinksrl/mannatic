

'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Company, addCompany, getCompanies, getCompaniesByDistributorId, deleteCompanyAndSubcollections, updateCompany, getUsers } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { Loader, PlusCircle, Building, MoreHorizontal, Pencil, Trash2, Import, UserPlus, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CompanyForm } from '@/components/dashboard/company-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CREATOR_USER_ID } from '@/lib/constants';
import { AddUserForm } from '@/components/dashboard/add-user-form';
import { User } from '@/lib/types';

const isMainCreator = (user: User | null) => user?.email === 'creator@mannatic.com';

function ClientCountCell({ companyId }: { companyId: string }) {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        const fetchCount = async () => {
            const { count: c } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId)
                .eq('role', 'Client');
            setCount(c || 0);
        };
        fetchCount();

        const channel = supabase
            .channel(`company-clients-cell-${companyId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `company_id=eq.${companyId}` }, () => {
                fetchCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [companyId]);

    if (count === null) {
        return <Loader className="h-4 w-4 animate-spin text-muted-foreground inline" />;
    }

    return <span className="font-medium text-center block w-full">{count}</span>;
}

export default function CompaniesPage() {
  const { user, companies, setCompanies } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [distributorMap, setDistributorMap] = useState<Record<string, string>>({});

  const isUserMainCreator = isMainCreator(user);

  useEffect(() => {
    async function fetchCompanies() {
        if (!user) return;
        setIsLoading(true);
        
        let companiesFromDb = [];
        // The main creator can see all companies to import them.
        if (isUserMainCreator) {
            try {
                const [fetchedCompanies, allUsers] = await Promise.all([
                    getCompanies(undefined, true),
                    getUsers()
                ]);
                companiesFromDb = fetchedCompanies;
                const map: Record<string, string> = {};
                allUsers.forEach((u: User) => {
                    map[u.id] = u.name || u.email;
                });
                setDistributorMap(map);
            } catch (e) {
                console.error("Failed to fetch users", e);
                companiesFromDb = await getCompanies(undefined, true);
            }
        } else if (user.role === 'Creator') {
            companiesFromDb = await getCompanies(user.id);
        } else if (user.role === 'Distributor') {
            companiesFromDb = await getCompaniesByDistributorId(user.id);
        } else {
             router.push('/dashboard');
             setIsLoading(false);
             return;
        }
        
        setCompanies(companiesFromDb);
        setIsLoading(false);
    }
    
    if (user) {
        fetchCompanies();
    } else {
        setIsLoading(false);
    }
  }, [user, router, isUserMainCreator, setCompanies]);

  const handleAddCompany = () => {
    setEditingCompany(null);
    setIsFormOpen(true);
  }

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setIsFormOpen(true);
  }

  const handleDeleteCompany = (company: Company) => {
    setCompanyToDelete(company);
    setIsDeleteDialogOpen(true);
  }
  
  const confirmDelete = async () => {
    if (!companyToDelete) return;
    try {
        await deleteCompanyAndSubcollections(companyToDelete.id);
        setCompanies(prev => prev.filter(c => c.id !== companyToDelete.id));
        toast({ title: 'Installatore eliminato', description: `L'installatore ${companyToDelete.name} è stato eliminato.` });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile eliminare l\'azienda.' });
    }
    setIsDeleteDialogOpen(false);
  }


  const handleFormSubmit = async (values: Partial<Company>) => {
    if (!user) return false;
    try {
      if (editingCompany) {
        const updated = await updateCompany(editingCompany.id, values);
        if (updated) {
          setCompanies(companies.map(c => c.id === updated.id ? updated : c));
          toast({ title: 'Installatore aggiornato', description: 'I dati sono stati salvati.' });
        }
      } else {
        const creatorId = isMainCreator(user) ? CREATOR_USER_ID : (user.role === 'Creator' ? user.id : undefined);
        const distributorId = user.role === 'Distributor' ? user.id : undefined;
        const newCompanyData = { ...values, creatorId, distributorId } as Company;
        
        const newCompany = await addCompany(newCompanyData);
        setCompanies([...companies, newCompany.company]);
        toast({ title: 'Installatore creato', description: `L'installatore ${newCompany.company.name} è stato creato.` });
      }
      return true;
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Errore',
            description: error.message || 'Si è verificato un errore.',
        });
        return false;
    }
  }

  const handleImportCompany = async (companyId: string) => {
    if (!user || !isUserMainCreator) return;
    setIsImporting(companyId);
    try {
        const updated = await updateCompany(companyId, { creatorId: CREATOR_USER_ID });
        if (updated) {
            setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, creatorId: CREATOR_USER_ID } : c));
            toast({ title: 'Installatore importato', description: 'L\'azienda è stata associata al tuo account.' });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Errore di importazione' });
    } finally {
        setIsImporting(null);
    }
  }


  if (isLoading || !user) {
    return (
      <>
        <Header title="Gestione Installatori" />
        <div className="flex items-center justify-center flex-1">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }
  
  if (user.role !== 'Creator' && user.role !== 'Distributor') {
    return (
        <div className="flex items-center justify-center flex-1">
          <p>Accesso non autorizzato.</p>
        </div>
    );
  }

  return (
    <>
      <Header title="Gestione Installatori" />
      <ScrollArea className="flex-1">
        <main className="p-4 md:p-6 lg:p-8 space-y-8">

          <div className="grid gap-6">
             <Card className="col-span-full">
                 <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                     <div>
                        <CardTitle>Elenco Installatori</CardTitle>
                        <CardDescription>Gestisci gli installatori presenti a sistema.</CardDescription>
                     </div>
                     <div className="flex gap-2">
                        <Button onClick={handleAddCompany}><PlusCircle className="mr-2 h-4 w-4"/> Crea Installatore</Button>
                        {isUserMainCreator && (
                            <AddUserForm onUserAdded={() => {}} defaultRole="Distributor">
                                <Button variant="outline"><UserPlus className="mr-2 h-4 w-4"/> Crea Distributore</Button>
                            </AddUserForm>
                        )}
                     </div>
                 </CardHeader>
                 <CardContent>
                     <Table>
                         <TableHeader>
                             <TableRow>
                                 <TableHead>ID</TableHead>
                                 <TableHead>Data Creazione</TableHead>
                                 <TableHead>Installatore</TableHead>
                                 <TableHead>Città</TableHead>
                                 <TableHead className="text-center">Clienti Attivi</TableHead>
                                 <TableHead>Distributore Collegato</TableHead>
                                 <TableHead className="text-right">Azioni</TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {companies.map(company => (
                                 <TableRow key={company.id}>
                                     <TableCell className="font-mono text-xs">{company.id}</TableCell>
                                     <TableCell>
                                        {company.createdAt 
                                            ? (typeof company.createdAt === 'object' && 'toDate' in company.createdAt ? company.createdAt.toDate().toLocaleDateString() : new Date(company.createdAt).toLocaleDateString())
                                            : '-'
                                        }
                                     </TableCell>
                                     <TableCell className="font-medium">
                                         <div className="flex items-center gap-3">
                                             {company.logoUrl ? (
                                                 <img src={company.logoUrl} alt={company.name} className="h-8 w-8 rounded-md object-contain border p-1" />
                                             ) : (
                                                 <Building className="h-6 w-6 text-muted-foreground shrink-0" />
                                             )}
                                             <span>{company.name}</span>
                                         </div>
                                     </TableCell>
                                     <TableCell>{company.city || '-'}</TableCell>
                                     <TableCell className="text-center">
                                         <ClientCountCell companyId={company.id} />
                                     </TableCell>
                                     <TableCell>
                                         {company.distributorId ? distributorMap[company.distributorId] || company.distributorId : 'creator@mannatic.com'}
                                     </TableCell>
                                     <TableCell className="text-right">
                                         <DropdownMenu>
                                             <DropdownMenuTrigger asChild>
                                                 <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                             </DropdownMenuTrigger>
                                             <DropdownMenuContent align="end">
                                                 {isUserMainCreator && company.creatorId !== CREATOR_USER_ID && (
                                                     <DropdownMenuItem onSelect={() => handleImportCompany(company.id)}>
                                                         <Import className="mr-2 h-4 w-4"/> Importa
                                                     </DropdownMenuItem>
                                                 )}
                                                 <DropdownMenuItem onSelect={() => handleEditCompany(company)}>
                                                     <Pencil className="mr-2 h-4 w-4"/> Modifica
                                                 </DropdownMenuItem>
                                                 <DropdownMenuSeparator />
                                                 <DropdownMenuItem onSelect={() => handleDeleteCompany(company)} className="text-destructive focus:text-destructive">
                                                     <Trash2 className="mr-2 h-4 w-4"/> Elimina
                                                 </DropdownMenuItem>
                                             </DropdownMenuContent>
                                         </DropdownMenu>
                                     </TableCell>
                                 </TableRow>
                             ))}
                         </TableBody>
                     </Table>
                 </CardContent>
             </Card>
          </div>
          
        </main>
      </ScrollArea>
       <CompanyForm 
          isOpen={isFormOpen} 
          setIsOpen={setIsFormOpen} 
          onSubmit={handleFormSubmit}
          company={editingCompany}
        />
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                  Questa azione non può essere annullata. Verrà eliminata permanentemente l'installatore <b>{companyToDelete?.name}</b> e tutti i dati associati, inclusi utenti, interventi, manutenzioni e sopralluoghi.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Elimina</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
