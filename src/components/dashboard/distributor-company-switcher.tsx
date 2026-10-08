
'use client';

import { useUser } from '@/contexts/user-context';
import { useState } from 'react';
import { Building, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { Company } from '@/lib/types';

export function DistributorCompanySwitcher() {
  const { user, companies, currentCompany, setCurrentCompany } = useUser();

  if (user?.role !== 'Distributor') return null;

  const handleSelectCompany = (company: Company) => {
    setCurrentCompany(company);
    localStorage.setItem('companyId', company.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 max-w-[200px]">
          {currentCompany?.logoUrl ? (
            <Image
              src={currentCompany.logoUrl}
              alt={currentCompany.name}
              width={20}
              height={20}
              className="rounded-sm object-contain shrink-0"
            />
          ) : (
            <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-medium">
            {currentCompany ? currentCompany.name : 'Seleziona installatore'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Le mie installatori ({companies.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.length === 0 && (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground text-sm">Nessun installatore</span>
          </DropdownMenuItem>
        )}
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => handleSelectCompany(company)}
            className="flex items-center gap-2 cursor-pointer"
          >
            {company.logoUrl ? (
              <Image
                src={company.logoUrl}
                alt={company.name}
                width={20}
                height={20}
                className="rounded-sm object-contain shrink-0"
              />
            ) : (
              <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate flex-1">{company.name}</span>
            {currentCompany?.id === company.id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
