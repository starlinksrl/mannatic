

'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Loader, UploadCloud } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCompanyById, getUsers, getInterventions, getSurveys, getNotifications, updateDocument } from '@/lib/data';
import { Company, User, Intervention, ScheduledMaintenance, Survey, Notification } from '@/lib/types';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

type Data = {
    companies: Company[];
    users: User[];
    interventions: (Intervention | ScheduledMaintenance)[];
    surveys: Survey[];
    notifications: Notification[];
}

type CollectionName = keyof Data;

interface ImageEditDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  imageUrl: string;
  onSave: (newUrl: string) => void;
}

function ImageEditDialog({ isOpen, setIsOpen, imageUrl, onSave }: ImageEditDialogProps) {
  const [newUrl, setNewUrl] = useState(imageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNewUrl(imageUrl);
  }, [imageUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave(newUrl);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifica Immagine</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL Immagine</Label>
            <Input id="imageUrl" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          </div>
          <div className="relative">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Clicca per caricare</span> o trascina
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF (max 800x400px)</p>
                </div>
                <input ref={fileInputRef} id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              </label>
            </div>
          </div>
          {newUrl && <Image src={newUrl} alt="Preview" width={100} height={100} className="object-contain rounded-md mx-auto" />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Annulla</Button>
          <Button onClick={handleSave}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


const JsonCell = ({ data, onSave }: { data: any; onSave: (newValue: any) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const { toast } = useToast();

  if (data === null || data === undefined) {
    return <pre className="text-xs text-muted-foreground">null</pre>;
  }
  
  if (typeof data === 'string' && (data.startsWith('data:image') || data.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) || data.includes('pravatar.cc'))) {
    const handleImageSave = async (newUrl: string) => {
        try {
            await onSave(newUrl);
            toast({ title: 'Immagine aggiornata', description: 'Il campo immagine è stato salvato.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile salvare l\'immagine.' });
        }
    };

    return (
      <>
        <Image 
          src={data} 
          alt="Data image" 
          width={40} 
          height={40} 
          className="object-contain rounded-md cursor-pointer" 
          onClick={() => {
            setCurrentImageUrl(data);
            setIsImageEditorOpen(true);
          }}
        />
        <ImageEditDialog 
          isOpen={isImageEditorOpen} 
          setIsOpen={setIsImageEditorOpen} 
          imageUrl={currentImageUrl}
          onSave={handleImageSave}
        />
      </>
    );
  }

  const jsonString = JSON.stringify(data, null, 2);
  const isExpandable = jsonString.length > 50;

  return (
    <div className="text-xs" onClick={() => isExpandable && setIsExpanded(!isExpanded)}>
        <pre className={`whitespace-pre-wrap break-all ${isExpandable && !isExpanded ? 'truncate' : ''} ${isExpandable ? 'cursor-pointer' : ''}`}>
            {jsonString}
        </pre>
    </div>
  )
}

function DataTable({ data, collectionName, onDataChange }: { data: any[], collectionName: CollectionName, onDataChange: () => void }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        return data.filter(item => 
            JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    if (!data || data.length === 0) {
        return <p className="text-muted-foreground">No data available.</p>;
    }

    const headers = Object.keys(data[0] || {});

    const handleSave = (docId: string, field: string) => async (newValue: any) => {
        await updateDocument(collectionName, docId, { [field]: newValue });
        onDataChange();
    };

    return (
        <div className="space-y-4">
            <Input 
                placeholder="Cerca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
            <Card>
                <ScrollArea className="h-[60vh]">
                <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                            {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.map((row) => (
                            <TableRow key={row.id}>
                                {headers.map(header => (
                                    <TableCell key={header}>
                                        <JsonCell 
                                            data={row[header]} 
                                            onSave={handleSave(row.id, header)}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </ScrollArea>
            </Card>
        </div>
    )
}


export default function AdminExplorerPage() {
    const { user, currentCompany } = useUser();
    const router = useRouter();
    const [data, setData] = useState<Partial<Data> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        if (!currentCompany) return;
        setIsLoading(true);
        const [company, users, interventions, surveys, notifications] = await Promise.all([
            getCompanyById(currentCompany.id),
            getUsers(currentCompany.id),
            getInterventions(currentCompany.id),
            getSurveys(currentCompany.id),
            getNotifications(currentCompany.id),
        ]);
        setData({ 
            companies: company ? [company] : [], 
            users, 
            interventions, 
            surveys, 
            notifications, 
        });
        setIsLoading(false);
    }

    useEffect(() => {
        if(user && user.role !== 'Admin') {
            router.push('/dashboard');
            return;
        }
        if (user && currentCompany) {
            fetchData();
        }
    }, [user, currentCompany, router]);


    if (isLoading || !user || !data) {
        return (
            <>
                <Header title="Data Explorer" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

    if (user.role !== 'Admin') {
        return null;
    }

    const collectionNames: CollectionName[] = ['companies', 'users', 'interventions', 'surveys', 'notifications'];

    return (
        <>
            <Header title="Data Explorer" />
            <ScrollArea className="flex-1">
                <main className="p-4 md:p-6 lg:p-8">
                    <Tabs defaultValue="companies">
                        <TabsList>
                            {collectionNames.map(name => (
                                <TabsTrigger key={name} value={name}>{name.charAt(0).toUpperCase() + name.slice(1)}</TabsTrigger>
                            ))}
                        </TabsList>
                        {collectionNames.map(name => (
                            <TabsContent key={name} value={name} className="pt-4">
                                <DataTable data={data[name] || []} collectionName={name} onDataChange={fetchData} />
                            </TabsContent>
                        ))}
                    </Tabs>
                </main>
            </ScrollArea>
        </>
    );
}
