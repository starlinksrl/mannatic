

'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { EditUserForm } from './edit-user-form';
import { useUser } from '@/contexts/user-context';
import { deleteUser } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
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

interface UsersTableProps {
  users: User[];
  onDataChange: () => void;
}

export function UsersTable({ users, onDataChange }: UsersTableProps) {
    const { user: currentUser } = useUser();
    const { toast } = useToast();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };
    
    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setIsDeleteDialogOpen(true);
    }

    const confirmDelete = async () => {
        if (!userToDelete) return;
        const success = await deleteUser(userToDelete.id);
        if (success) {
            onDataChange();
            toast({
                title: 'Utente eliminato',
                description: `L'utente ${userToDelete.name} è stato eliminato con successo.`,
            });
        } else {
             toast({
                variant: 'destructive',
                title: 'Errore',
                description: "Impossibile eliminare l'utente.",
            });
        }
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
    }


    const getRoleBadge = (role: User['role']) => {
        switch (role) {
            case 'Admin': return <Badge variant="destructive">Admin</Badge>;
            case 'Operator': return <Badge className="bg-blue-100 text-blue-800">Operator</Badge>;
            case 'Client': return <Badge variant="secondary">Client</Badge>;
        }
    }

  return (
    <>
    <Card className="lg:hidden">
      <CardContent className="p-2 space-y-2">
        {users.map((user) => (
            <div key={user.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex justify-between items-start">
                <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => handleEditClick(user)}>
                    <Avatar className="h-10 w-10 border">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {getRoleBadge(user.role)}
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => handleEditClick(user)}>
                            <Pencil className="mr-2" /> Modifica
                        </DropdownMenuItem>
                        {currentUser?.role === 'Admin' && user.id !== currentUser.id && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onSelect={() => handleDeleteClick(user)}>
                                    <Trash2 className="mr-2" /> Elimina
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          ))}
      </CardContent>
    </Card>
    <Card className="hidden lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Ruolo</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="cursor-pointer" onClick={() => handleEditClick(user)}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                     <span className="font-medium">{user.name}</span>
                     <span className="text-muted-foreground sm:hidden">{user.email}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell cursor-pointer" onClick={() => handleEditClick(user)}>{user.email}</TableCell>
              <TableCell className="hidden md:table-cell cursor-pointer" onClick={() => handleEditClick(user)}>{getRoleBadge(user.role)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => handleEditClick(user)}>
                            <Pencil className="mr-2" /> Modifica
                        </DropdownMenuItem>
                        {currentUser?.role === 'Admin' && user.id !== currentUser.id && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onSelect={() => handleDeleteClick(user)}>
                                    <Trash2 className="mr-2" /> Elimina
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
     <EditUserForm
        user={selectedUser}
        onUserUpdated={onDataChange}
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
                Questa azione non può essere annullata. L'utente <b>{userToDelete?.name}</b> verrà eliminato definitivamente.
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

    