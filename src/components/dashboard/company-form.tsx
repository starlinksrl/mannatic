

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Autocomplete } from '@react-google-maps/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Company } from '@/lib/types';
import { Loader } from 'lucide-react';
import { useMaps } from '@/contexts/maps-context';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';


const createFormSchema = z.object({
    name: z.string().min(1, { message: 'Il nome è obbligatorio' }),
    address: z.string().optional(),
    city: z.string().optional(),
    referentName: z.string().optional(),
    referentPhone: z.string().optional(),
    vatNumber: z.string().optional(),
    taxCode: z.string().optional(),
    phone: z.string().optional(),
    uniqueCode: z.string().optional(),
    platformUrl: z.string().url({ message: 'URL non valido' }).optional().or(z.literal('')),
    email: z.string().email({ message: 'Email non valida' }),
    password: z.string().min(8, { message: 'La password deve contenere almeno 8 caratteri' })
});

const editFormSchema = z.object({
    name: z.string().min(1, { message: 'Il nome è obbligatorio' }),
    address: z.string().optional(),
    city: z.string().optional(),
    referentName: z.string().optional(),
    referentPhone: z.string().optional(),
    vatNumber: z.string().optional(),
    taxCode: z.string().optional(),
    phone: z.string().optional(),
    uniqueCode: z.string().optional(),
    platformUrl: z.string().url({ message: 'URL non valido' }).optional().or(z.literal('')),
    email: z.string().email({ message: 'Email non valida' }),
});


interface CompanyFormProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onSubmit: (values: Partial<Company>) => Promise<boolean>;
    company: Company | null;
}

export function CompanyForm({ isOpen, setIsOpen, onSubmit, company }: CompanyFormProps) {
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isEditing = !!company;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientCount, setClientCount] = useState<number>(0);
    
    const { isLoaded } = useMaps();

    useEffect(() => {
        if (!isOpen || !company?.id) return;
        
        const fetchCount = async () => {
            const { count } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id)
                .eq('role', 'Client');
            setClientCount(count || 0);
        };
        fetchCount();

        const channel = supabase
            .channel(`company-clients-${company.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `company_id=eq.${company.id}` }, () => {
                fetchCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [company?.id, isOpen]);

    const form = useForm<z.infer<typeof createFormSchema | typeof editFormSchema>>({
        resolver: zodResolver(isEditing ? editFormSchema : createFormSchema),
        defaultValues: {
            name: '',
            address: '',
            vatNumber: '',
            taxCode: '',
            phone: '',
            uniqueCode: '',
            platformUrl: '',
            email: '',
            password: ''
        },
    });

    useEffect(() => {
        if (company) {
            form.reset({
                name: company.name,
                address: company.address || '',
                city: company.city || '',
                referentName: company.referentName || '',
                referentPhone: company.referentPhone || '',
                vatNumber: company.vatNumber || '',
                taxCode: company.taxCode || '',
                phone: company.phone || '',
                uniqueCode: company.uniqueCode || '',
                platformUrl: company.platformUrl || '',
                email: company.email || '',
            });
        } else {
            form.reset({
                name: '',
                address: '',
                city: '',
                referentName: '',
                referentPhone: '',
                vatNumber: '',
                taxCode: '',
                phone: '',
                uniqueCode: '',
                platformUrl: '',
                email: '',
                password: ''
            });
        }
    }, [company, form, isOpen]);


    const handleFormSubmit = async (values: z.infer<typeof createFormSchema | typeof editFormSchema>) => {
        setIsSubmitting(true);
        const success = await onSubmit(values);
        if (success) {
            setIsOpen(false);
        }
        setIsSubmitting(false);
    };
    
    const handlePlaceChanged = () => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            if (place && place.formatted_address) {
                form.setValue('address', place.formatted_address, { shouldValidate: true, shouldDirty: true });
                
                // Try to extract the city (locality) from the address components
                if (place.address_components) {
                    const localityComponent = place.address_components.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_3'));
                    if (localityComponent) {
                        form.setValue('city', localityComponent.long_name, { shouldValidate: true, shouldDirty: true });
                    }
                }
            }
        }
    };


    return (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-2xl flex flex-col p-0 max-h-[calc(100dvh-1.5rem)] md:max-h-[90vh] h-[calc(100dvh-1.5rem)] md:h-auto w-[calc(100%-1rem)] sm:w-full rounded-2xl md:rounded-lg overflow-hidden">
                <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-0 shrink-0 pr-12">
                    <DialogTitle>{isEditing ? `Modifica ${company?.name}` : 'Crea una nuovo installatore'}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 min-h-0 h-auto overflow-y-auto">
                    <div className="p-4 sm:p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)} id="company-form" className="space-y-4">
                            {isEditing && (
                                <div className="flex gap-4 p-4 bg-muted/50 rounded-lg mb-4">
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground mb-1">Data Creazione</p>
                                        <p className="font-medium">
                                            {company?.createdAt 
                                                ? (typeof company.createdAt === 'object' && 'toDate' in company.createdAt ? company.createdAt.toDate().toLocaleDateString() : new Date(company.createdAt).toLocaleDateString())
                                                : '-'}
                                        </p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground mb-1">Clienti Attivi</p>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-2xl">{clientCount}</p>
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Live</Badge>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Nome Azienda</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome della nuovo installatore" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Indirizzo</FormLabel>
                                    <FormControl>
                                          {isLoaded ? (
                                              <Autocomplete
                                                  onLoad={(autocomplete) => {
                                                      autocompleteRef.current = autocomplete;
                                                  }}
                                                  onPlaceChanged={handlePlaceChanged}
                                                  fields={['formatted_address', 'address_components']}
                                              >
                                                  <Input
                                                      {...field}
                                                      ref={inputRef}
                                                      placeholder="Via, CAP"
                                                  />
                                              </Autocomplete>
                                          ) : (
                                          <Input {...field} placeholder="Via, CAP" disabled/>
                                          )}
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                  control={form.control}
                                  name="city"
                                  render={({ field }) => (
                                      <FormItem>
                                      <FormLabel>Città</FormLabel>
                                      <FormControl>
                                          <Input placeholder="Es. Roma" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                      </FormItem>
                                  )}
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="referentName"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Referente (Nome e Cognome)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome referente..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="referentPhone"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Cellulare Referente</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Numero di cellulare..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
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
                             <FormField
                                control={form.control}
                                name="platformUrl"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Link Piattaforma</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://work.azienda.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Email (per login admin)</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="admin@azienda.com" {...field} disabled={isEditing} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {!isEditing && (
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
                                )}
                            </div>
                        </form>
                    </Form>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-4 sm:p-6 gap-2 border-t shrink-0 bg-background">
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isSubmitting}>Annulla</Button>
                    </DialogClose>
                    <Button type="submit" form="company-form" disabled={isSubmitting}>
                        {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? 'Salva Modifiche' : 'Crea Installatore'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
