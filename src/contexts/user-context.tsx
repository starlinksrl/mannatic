

'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUserByEmail, getUserById, getCompanies, Company, getUsers, getCompanyById } from '@/lib/data';

const isMainCreator = (user: User | null) => user?.email === 'creator@mannatic.com';

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (user: User) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  currentCompany: Company | null;
  switchCompany: (companyId: string | null) => Promise<void>;
  setCurrentCompany: React.Dispatch<React.SetStateAction<Company | null>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initializeSession = async () => {
        setIsLoading(true);
        try {
            const savedUserJson = localStorage.getItem('user');
            if (savedUserJson) {
                const savedUser = JSON.parse(savedUserJson);
                // Directly log in the user, which will also set the company context
                await login(savedUser, true);
            }
        } catch (error) {
            console.error("Failed to initialize session:", error);
            logout();
        } finally {
            setIsLoading(false);
        }
    };
    initializeSession();
  }, []);
  
  const login = async (loggedInUser: User, isInitializing: boolean = false) => {
    setIsLoading(true);

    const freshUser = await getUserById(loggedInUser.id);
    if (!freshUser) {
        logout();
        setIsLoading(false);
        return;
    }
    
    setUser(freshUser);
    localStorage.setItem('user', JSON.stringify(freshUser));

    let companyToSet: Company | null = null;
    let companyIdToSet: string | null = null;

    if (freshUser.role === 'Creator') {
        const creatorCompanies = await getCompanies(isMainCreator(freshUser) ? undefined : freshUser.id);
        setCompanies(creatorCompanies);
        
        if (isInitializing) {
            const savedCompanyId = localStorage.getItem('companyId');
            if (savedCompanyId) {
                companyToSet = creatorCompanies.find(c => c.id === savedCompanyId) || null;
                companyIdToSet = companyToSet ? companyToSet.id : null;
            }
        }
    } else {
        companyToSet = await getCompanyById(freshUser.companyId);
        if (!companyToSet) {
            logout();
            setIsLoading(false);
            return;
        }
        companyIdToSet = companyToSet.id;
    }

    setCurrentCompany(companyToSet);
    if (companyIdToSet) {
        localStorage.setItem('companyId', companyIdToSet);
    } else {
        localStorage.removeItem('companyId');
    }
    
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setCurrentCompany(null);
    localStorage.removeItem('user');
    localStorage.removeItem('companyId');
    router.push('/login');
  };

  const switchCompany = async (companyId: string | null) => {
      if (!user || user.role !== 'Creator') {
          return;
      }
      
      if (companyId === null) {
          setCurrentCompany(null);
          localStorage.removeItem('companyId');
          return;
      }
      
      const company = await getCompanyById(companyId);

      if (company) {
          setCurrentCompany(company);
          localStorage.setItem('companyId', companyId);
      }
  }

  const value = { 
    user, 
    setUser,
    login,
    logout, 
    isLoading, 
    companies,
    setCompanies,
    currentCompany,
    switchCompany,
    setCurrentCompany,
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

