
'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUserByEmail, getUserById, getCompanies, Company, getUsers, getCompanyById } from '@/lib/data';
import { CREATOR_USER } from '@/lib/constants';

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (user: User) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  companies: Company[];
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
  
  useEffect(() => {
    const fetchCompanies = async () => {
      const allCompanies = await getCompanies();
      setCompanies(allCompanies);
    };
    if (user?.role === 'Creator') {
        fetchCompanies();
    }
  }, [user]);

  const login = async (loggedInUser: User) => {
    setIsLoading(true);
    
    // Re-validate user from DB to get fresh data
    const freshUser = await getUserById(loggedInUser.id);
    if (!freshUser) {
        logout();
        return;
    }
    
    setUser(freshUser);
    localStorage.setItem('user', JSON.stringify(freshUser));

    if (freshUser.role === 'Creator') {
        const companyId = localStorage.getItem('companyId');
        await switchCompany(companyId);
    } else {
        await switchCompany(freshUser.companyId);
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
      if (companyId === null) {
          setCurrentCompany(null);
          localStorage.removeItem('companyId');
          return;
      }
      
      const company = companies.find(c => c.id === companyId) || await getCompanyById(companyId);

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
