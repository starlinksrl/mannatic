

'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Company, addCompany, getCompanies, deleteCompanyAndSubcollections, updateCompany } from '@/lib/data';
import { Loader, PlusCircle, Building, MoreHorizontal, Pencil, Trash2, Import } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
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
import { ChangelogDisplay } from '@/components/dashboard/changelog-display';
import { CREATOR_USER_ID } from '@/lib/constants';

const isMainCreator = (user: Company | null) => user?.email === 'creator@mannatic.com';

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

  const isUserMainCreator = isMainCreator(user);

  useEffect(() => {
    async function fetchCompanies() {
        if (!user) return;
        setIsLoading(true);
        
        let companiesFromDb = [];
        // The main creator can see all companies to import them.
        if (isUserMainCreator) {
            companiesFromDb = await getCompanies(undefined, true);
        } else if (user.role === 'Creator') {
            companiesFromDb = await getCompanies(user.id);
        } else {
             router.push('/dashboard');
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
          toast({ title: 'Azienda aggiornata', description: 'I dati sono stati salvati.' });
        }
      } else {
        const creatorId = isMainCreator(user) ? CREATOR_USER_ID : user.id;
        const newCompanyData = { ...values, creatorId } as Company;
        
        const newCompany = await addCompany(newCompanyData);
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

  const handleImportCompany = async (companyId: string) => {
    if (!user || !isUserMainCreator) return;
    setIsImporting(companyId);
    try {
        const updated = await updateCompany(companyId, { creatorId: CREATOR_USER_ID });
        if (updated) {
            setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, creatorId: CREATOR_USER_ID } : c));
            toast({ title: 'Azienda importata', description: 'L\'azienda è stata associata al tuo account.' });
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
        <Header title="Gestione Aziende" />
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
      <Header title="Gestione Aziende" />
      <ScrollArea className="flex-1">
        <main className="p-4 md:p-6 lg:p-8 space-y-8">

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card className="flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all" onClick={handleAddCompany}>
              <CardContent className="p-6 text-center">
                <PlusCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="mt-4 font-medium">Crea Nuova Azienda</p>
              </CardContent>
            </Card>
            {companies.map(company => (
              <Card key={company.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                     <div className="flex items-center gap-3 cursor-pointer break-words" onClick={() => handleEditCompany(company)}>
                        {company.logoUrl ? (
                            <img src={company.logoUrl} alt={company.name} className="h-10 w-10 rounded-md object-contain border p-1" />
                        ) : (
                            <Building className="h-8 w-8 text-muted-foreground shrink-0" />
                        )}
                        <span>{company.name}</span>
                     </div>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => handleEditCompany(company)}><Pencil className="mr-2"/> Modifica</DropdownMenuItem>
                               <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleDeleteCompany(company)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2"/> Elimina</DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow cursor-pointer" onClick={() => handleEditCompany(company)}>
                  <p className="text-sm text-muted-foreground">{company.address || 'Nessun indirizzo'}</p>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground justify-between items-center">
                    <span>ID: {company.id}</span>
                     {isUserMainCreator && !company.creatorId && (
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => handleImportCompany(company.id)}
                            disabled={isImporting === company.id}
                        >
                            {isImporting === company.id ? <Loader className="mr-2 animate-spin" /> : <Import className="mr-2" />}
                            Importa
                        </Button>
                    )}
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <Separator />
          
          <ChangelogDisplay />
          
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

