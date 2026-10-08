

'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUserByEmail, getUserById, getCompanies, getCompaniesByDistributorId, Company, getUsers, getCompanyById } from '@/lib/data';
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

    try {
      const userToStore = { ...freshUser };
      // Strip out huge inline base64 images if any, so localStorage never exceeds quota
      if (userToStore.avatarUrl && userToStore.avatarUrl.length > 2048) {
        userToStore.avatarUrl = '';
      }
      if (userToStore.logoUrl && userToStore.logoUrl.length > 2048) {
        userToStore.logoUrl = '';
      }
      localStorage.setItem('user', JSON.stringify(userToStore));
    } catch (storageError) {
      console.warn("Could not save full user to localStorage, saving minimal session:", storageError);
      try {
        localStorage.setItem('user', JSON.stringify({
          id: freshUser.id,
          name: freshUser.name,
          email: freshUser.email,
          role: freshUser.role,
          companyId: freshUser.companyId,
          distributorId: freshUser.distributorId,
        }));
      } catch (e) {
        console.error("Critical: Failed to store session to localStorage:", e);
      }
    }

    if (freshUser.role === 'Creator') {
        const allCompanies = await getCompanies(freshUser.id);
        setCompanies(allCompanies);
        setCurrentCompany(null);
        localStorage.removeItem('companyId');
    } else if (freshUser.role === 'Distributor') {
        const allCompanies = await getCompaniesByDistributorId(freshUser.id);
        setCompanies(allCompanies);
        const savedCompanyId = localStorage.getItem('companyId');
        const savedCompany = savedCompanyId ? allCompanies.find(c => c.id === savedCompanyId) || null : null;
        setCurrentCompany(savedCompany);
    } else if (freshUser.role === 'DistributorAdmin' || freshUser.role === 'DistributorUser') {
        // Operator accounts: load companies via their parent distributorId
        const parentDistributorId = freshUser.distributorId;
        if (parentDistributorId) {
            const allCompanies = await getCompaniesByDistributorId(parentDistributorId);
            setCompanies(allCompanies);
            const savedCompanyId = localStorage.getItem('companyId');
            const savedCompany = savedCompanyId ? allCompanies.find(c => c.id === savedCompanyId) || null : null;
            setCurrentCompany(savedCompany);
        }
    } else {
        const companyToSet = freshUser.companyId ? await getCompanyById(freshUser.companyId) : null;
        if (!companyToSet) {
            if (freshUser.role === 'Client') {
                setCurrentCompany(null);
            } else {
                logout();
                setIsLoading(false);
                return;
            }
        } else {
            setCurrentCompany(companyToSet);
            try {
                localStorage.setItem('companyId', companyToSet.id);
            } catch (e) {}
        }
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
