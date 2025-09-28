
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
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Company } from '@/lib/types';

const libraries: ('places' | 'drawing' | 'geometry' | 'localContext' | 'visualization')[] = ['places'];

const createFormSchema = z.object({
    name: z.string().min(1, { message: 'Il nome è obbligatorio' }),
    address: z.string().optional(),
    vatNumber: z.string().optional(),
    taxCode: z.string().optional(),
    phone: z.string().optional(),
    uniqueCode: z.string().optional(),
    email: z.string().email({ message: 'Email non valida' }),
    password: z.string().min(8, { message: 'La password deve contenere almeno 8 caratteri' })
});

const editFormSchema = z.object({
    name: z.string().min(1, { message: 'Il nome è obbligatorio' }),
    address: z.string().optional(),
    vatNumber: z.string().optional(),
    taxCode: z.string().optional(),
    phone: z.string().optional(),
    uniqueCode: z.string().optional(),
    email: z.string().email({ message: 'Email non valida' }),
    password: z.string().optional() // Password is optional on edit
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
    
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries,
    });

    const form = useForm<z.infer<typeof editFormSchema>>({
        resolver: zodResolver(isEditing ? editFormSchema : createFormSchema),
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
        if (company) {
            form.reset({
                name: company.name,
                address: company.address || '',
                vatNumber: company.vatNumber || '',
                taxCode: company.taxCode || '',
                phone: company.phone || '',
                uniqueCode: company.uniqueCode || '',
                email: company.email || '',
                password: '',
            });
        } else {
            form.reset({
                name: '',
                address: '',
                vatNumber: '',
                taxCode: '',
                phone: '',
                uniqueCode: '',
                email: '',
                password: ''
            });
        }
    }, [company, form, isOpen]);


    const handleFormSubmit = async (values: z.infer<typeof editFormSchema>) => {
        const success = await onSubmit(values);
        if (success) {
            setIsOpen(false);
        }
    };
    
    const handlePlaceChanged = () => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            if (place && place.formatted_address) {
                form.setValue('address', place.formatted_address, { shouldValidate: true, shouldDirty: true });
            }
        }
    };


    return (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-2xl grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
                    <DialogHeader className="p-6 pb-0">
                    <DialogTitle>{isEditing ? `Modifica ${company?.name}` : 'Crea una nuova azienda'}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-full">
                    <div className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)} id="company-form" className="space-y-4">
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
                                        {isLoaded ? (
                                            <Autocomplete
                                                onLoad={(autocomplete) => {
                                                    autocompleteRef.current = autocomplete;
                                                }}
                                                onPlaceChanged={handlePlaceChanged}
                                                fields={['formatted_address']}
                                            >
                                                <Input
                                                    {...field}
                                                    ref={inputRef}
                                                    placeholder="Via, Città, CAP"
                                                />
                                            </Autocomplete>
                                        ) : (
                                        <Input {...field} placeholder="Via, Città, CAP" disabled/>
                                        )}
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
                                            <Input type="password" placeholder={isEditing ? "Lascia vuoto per non modificare" : ""} {...field} />
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
                    <Button type="submit" form="company-form">{isEditing ? 'Salva Modifiche' : 'Crea Azienda'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
