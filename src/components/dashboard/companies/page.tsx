

'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Company, getCompanies, addCompany, deleteCompanyAndSubcollections, updateCompany, getUsers } from '@/lib/data';
import { User } from '@/lib/types';
import { Loader, PlusCircle, Building, MoreHorizontal, Pencil, Trash2, UserCircle } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"

const isMainCreator = (user: any | null) => user?.email === 'creator@mannatic.com';

export default function CompaniesPage() {
  const { user, companies, setCompanies } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [distributorMap, setDistributorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && user.role !== 'Creator') {
      router.push('/dashboard');
    }
  }, [user, router]);
  
  useEffect(() => {
    async function fetchCompanies() {
        if (!user) return;
        setIsLoading(true);

        if (isMainCreator(user)) {
            // Main creator: carica TUTTI gli installatori e i distributori
            const [allCompanies, allUsers] = await Promise.all([
                getCompanies(undefined, true),
                getUsers(),
            ]);
            setCompanies(allCompanies);

            // Costruisce mappa distributoreId → nome
            const map: Record<string, string> = {};
            allUsers
                .filter((u: User) => u.role === 'Distributor')
                .forEach((u: User) => { map[u.id] = u.name; });
            setDistributorMap(map);
        } else {
            const companiesFromDb = await getCompanies(user.id);
            setCompanies(companiesFromDb);
        }

        setIsLoading(false);
    }
    
    if (user) {
        fetchCompanies();
    } else {
        setIsLoading(false);
    }
  }, [user, setCompanies]);
  
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
        toast({ title: 'Azienda eliminata', description: `L'azienda ${companyToDelete.name} è stata eliminata.` });
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
        const creatorId = isMainCreator(user) ? undefined : user.id;
        const newCompanyData = { ...values as Company };
        if (creatorId) {
            newCompanyData.creatorId = creatorId;
        }
        const newCompany = await addCompany(newCompanyData as any);
        setCompanies([...companies, newCompany.company]);
        toast({ title: 'Azienda creata', description: `L'azienda ${newCompany.company.name} è stata creata.` });
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
  
  if (user.role !== 'Creator') {
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
                 <CardHeader className="flex flex-row items-center justify-between">
                     <div>
                        <CardTitle>Elenco Installatori</CardTitle>
                        <CardDescription>Gestisci gli installatori presenti a sistema.</CardDescription>
                     </div>
                     <Button onClick={handleAddCompany}><PlusCircle className="mr-2 h-4 w-4"/> Crea Installatore</Button>
                 </CardHeader>
                 <CardContent>
                     <Table>
                         <TableHeader>
                             <TableRow>
                                 <TableHead>ID</TableHead>
                                 <TableHead>Data Creazione</TableHead>
                                 <TableHead>Installatore</TableHead>
                                 <TableHead>Città</TableHead>
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
                                            : '-'}
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
                                     <TableCell>
                                        {isMainCreator(user) ? (
                                            company.distributorId ? distributorMap[company.distributorId] || company.distributorId : '-'
                                        ) : (
                                            '-'
                                        )}
                                     </TableCell>
                                     <TableCell className="text-right">
                                         <DropdownMenu>
                                             <DropdownMenuTrigger asChild>
                                                 <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                             </DropdownMenuTrigger>
                                             <DropdownMenuContent align="end">
                                                 <DropdownMenuItem onSelect={() => handleEditCompany(company)}><Pencil className="mr-2 h-4 w-4"/> Modifica</DropdownMenuItem>
                                                 <DropdownMenuSeparator />
                                                 <DropdownMenuItem onSelect={() => handleDeleteCompany(company)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Elimina</DropdownMenuItem>
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
                  Questa azione non può essere annullata. Verrà eliminata permanentemente l'azienda <b>{companyToDelete?.name}</b> e tutti i dati associati, inclusi utenti, interventi, manutenzioni e sopralluoghi.
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
