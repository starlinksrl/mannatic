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
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { MoreHorizontal, Pencil } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { EditUserForm } from './edit-user-form';

interface UsersTableProps {
  users: User[];
  onUserUpdated: (user: User) => void;
}

export function UsersTable({ users, onUserUpdated }: UsersTableProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const getRoleBadge = (role: User['role']) => {
        switch (role) {
            case 'Admin': return <Badge variant="destructive">Admin</Badge>;
            case 'Operator': return <Badge className="bg-blue-100 text-blue-800">Operator</Badge>;
            case 'Client': return <Badge variant="secondary">Client</Badge>;
        }
    }

  return (
    <>
    <Card>
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
            <TableRow key={user.id} onClick={() => handleEditClick(user)} className="cursor-pointer">
              <TableCell>
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
              <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
              <TableCell className="hidden md:table-cell">{getRoleBadge(user.role)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => handleEditClick(user)}>
                            <Pencil className="mr-2" /> Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Elimina</DropdownMenuItem>
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
        onUserUpdated={onUserUpdated}
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
      />
    </>
  );
}
