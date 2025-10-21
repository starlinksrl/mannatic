

'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUserByEmail, getUserById, getCompanies, Company, getUsers, getCompanyById } from '@/lib/data';
import { CREATOR_USER_ID } from '@/lib/constants';

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
                await login(savedUser);
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
  
  const login = async (loggedInUser: User) => {
    setIsLoading(true);

    const freshUser = await getUserById(loggedInUser.id);
    if (!freshUser) {
        logout();
        setIsLoading(false);
        return;
    }
    
    setUser(freshUser);
    localStorage.setItem('user', JSON.stringify(freshUser));

    if (freshUser.role === 'Creator') {
        const allCompanies = await getCompanies(freshUser.id);
        setCompanies(allCompanies);
        setCurrentCompany(null);
        localStorage.removeItem('companyId');
    } else {
        const companyToSet = await getCompanyById(freshUser.companyId);
        if (!companyToSet) {
            logout();
            setIsLoading(false);
            return;
        }
        setCurrentCompany(companyToSet);
        localStorage.setItem('companyId', companyToSet.id);
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
    // This function is now disabled for creators as they no longer impersonate.
    // Kept for potential future use or for other roles.
    return;
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
