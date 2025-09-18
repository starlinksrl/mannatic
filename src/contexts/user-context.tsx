

'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUserByEmail, getUserById, getAllUsers, getCompanies, Company, getUsers } from '@/lib/data';

const CREATOR_USER_ID = 'user-creator';

interface UserContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  switchUser: (userId: string) => void;
  availableUsers: User[];
  creator: User | null;
  companies: Company[];
  currentCompany: Company | null;
  switchCompany: (companyId: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const creatorUser: User = { 
  id: CREATOR_USER_ID, 
  name: 'Creator', 
  email: 'creator@mannatic.com', 
  role: 'Creator', 
  avatarUrl: 'https://i.pravatar.cc/150?u=creator', 
  password: 'creatorpassword',
  companyId: 'none'
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      const allCompanies = await getCompanies();
      setCompanies(allCompanies);

      const savedUserJson = localStorage.getItem('user');
      let savedUser: User | null = null;
      if (savedUserJson) {
        savedUser = JSON.parse(savedUserJson);
        const freshUser = savedUser.id === creatorUser.id ? creatorUser : await getUserById(savedUser.id);
        setUser(freshUser);

        if (freshUser?.role === 'Creator') {
           const savedCompanyId = localStorage.getItem('companyId');
           if (savedCompanyId) {
             const company = allCompanies.find(c => c.id === savedCompanyId);
             if (company) {
                setCurrentCompany(company);
                const companyUsers = await getUsers(company.id);
                setAvailableUsers([creatorUser, ...companyUsers]);
             } else {
                setAvailableUsers([creatorUser]);
             }
           } else {
             setAvailableUsers([creatorUser]);
           }
        } else if (freshUser) {
           const company = allCompanies.find(c => c.id === freshUser.companyId);
           setCurrentCompany(company || null);
           if (company) {
             const companyUsers = await getUsers(company.id);
             setAvailableUsers([creatorUser, ...companyUsers]);
           }
        }

      }
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase();
    let foundUser: User | null = null;
    if (normalizedEmail === creatorUser.email && password === creatorUser.password) {
      foundUser = creatorUser;
    } else {
      foundUser = await getUserByEmail(normalizedEmail);
      if (foundUser?.password !== password) foundUser = null;
    }
    
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('user', JSON.stringify(foundUser));

      if (foundUser.role === 'Creator') {
        setCurrentCompany(null);
        localStorage.removeItem('companyId');
        setAvailableUsers([creatorUser]);
        router.push('/dashboard/companies');
      } else {
        const company = await companies.find(c => c.id === foundUser?.companyId);
        setCurrentCompany(company || null);
        if (company) {
          localStorage.setItem('companyId', company.id);
          const companyUsers = await getUsers(company.id);
          setAvailableUsers([creatorUser, ...companyUsers]);
        }
        router.push('/dashboard');
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setCurrentCompany(null);
    localStorage.removeItem('user');
    localStorage.removeItem('companyId');
  };
  
  const switchUser = async (userId: string) => {
    if (userId === CREATOR_USER_ID) {
      setUser(creatorUser);
      setCurrentCompany(null);
      localStorage.setItem('user', JSON.stringify(creatorUser));
      localStorage.removeItem('companyId');
      setAvailableUsers([creatorUser]);
      router.push('/dashboard/companies');
      return;
    }
    
    const selectedUser = await getUserById(userId);
    
    if (selectedUser) {
      setUser(selectedUser);
      localStorage.setItem('user', JSON.stringify(selectedUser));

      if (selectedUser.companyId !== currentCompany?.id) {
          await switchCompany(selectedUser.companyId);
      }
    }
  }

  const switchCompany = async (companyId: string) => {
      const company = companies.find(c => c.id === companyId);
      if (company && user?.role === 'Creator') {
          setCurrentCompany(company);
          localStorage.setItem('companyId', companyId);
          const companyUsers = await getUsers(companyId);
          setAvailableUsers([creatorUser, ...companyUsers]);
          router.push('/dashboard');
      }
  }

  const value = { 
    user, 
    login, 
    logout, 
    isLoading, 
    switchUser, 
    availableUsers,
    creator: creatorUser,
    companies,
    currentCompany,
    switchCompany
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
