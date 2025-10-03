

'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUserByEmail, getUserById, getCompanies, Company, getUsers, getCompanyById } from '@/lib/data';
import { CREATOR_USER } from '@/lib/constants';

interface UserContextType {
  user: User | null; // The currently active user (can be the original or a simulated one)
  sessionUser: User | null; // The user who originally logged in
  login: (user: User, sessionUser: User) => void;
  logout: () => void;
  isLoading: boolean;
  switchUser: (userId: string) => void;
  availableUsers: User[];
  creator: User | null;
  companies: Company[];
  currentCompany: Company | null;
  switchCompany: (companyId: string | null) => void;
  setCurrentCompany: React.Dispatch<React.SetStateAction<Company | null>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initializeSession = async () => {
        setIsLoading(true);
        try {
            const savedUserJson = localStorage.getItem('user');
            const savedSessionUserJson = localStorage.getItem('sessionUser');

            if (savedUserJson && savedSessionUserJson) {
                const savedUser = JSON.parse(savedUserJson);
                const savedSessionUser = JSON.parse(savedSessionUserJson);
                
                // Re-validate user from DB
                const freshUser = await getUserById(savedUser.id);
                if (freshUser) {
                    await login(freshUser, savedSessionUser);
                } else {
                    logout();
                }
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
    fetchCompanies();
  }, []);

  const login = async (loggedInUser: User, sessionUser: User) => {
    setIsLoading(true);
    setUser(loggedInUser);
    setSessionUser(sessionUser);
    
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    localStorage.setItem('sessionUser', JSON.stringify(sessionUser));

    if (sessionUser.role === 'Creator') {
        const companyId = localStorage.getItem('companyId');
        if (companyId) {
            await switchCompany(companyId);
        } else {
            await switchCompany(null);
        }
    } else {
        await switchCompany(loggedInUser.companyId);
    }

    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setSessionUser(null);
    setCurrentCompany(null);
    setAvailableUsers([]);
    localStorage.removeItem('user');
    localStorage.removeItem('sessionUser');
    localStorage.removeItem('companyId');
    router.push('/login');
  };
  
  const switchUser = async (userId: string) => {
    if (sessionUser?.role !== 'Creator') return; // Only creator can switch

    const selectedUser = await getUserById(userId);
    
    if (selectedUser) {
      setUser(selectedUser);
      localStorage.setItem('user', JSON.stringify(selectedUser));

      if (selectedUser.id === CREATOR_USER.id) {
        await switchCompany(null);
      } else if (selectedUser.companyId !== currentCompany?.id) {
        await switchCompany(selectedUser.companyId);
      }
      router.push('/dashboard');
    }
  }

  const switchCompany = async (companyId: string | null) => {
      if (companyId === null) {
          setCurrentCompany(null);
          localStorage.removeItem('companyId');
          setUser(CREATOR_USER);
          localStorage.setItem('user', JSON.stringify(CREATOR_USER));
          setAvailableUsers([CREATOR_USER]);
          return;
      }
      
      const company = companies.find(c => c.id === companyId) || await getCompanyById(companyId);

      if (company) {
          setCurrentCompany(company);
          localStorage.setItem('companyId', companyId);
          const companyUsers = await getUsers(companyId);
          setAvailableUsers([CREATOR_USER, ...companyUsers]);
          // When creator switches company, they become the active user for that context
          if (user?.id !== CREATOR_USER.id) {
            setUser(CREATOR_USER);
            localStorage.setItem('user', JSON.stringify(CREATOR_USER));
          }
      }
  }

  const value = { 
    user, 
    sessionUser,
    login,
    logout, 
    isLoading, 
    switchUser, 
    availableUsers,
    creator: CREATOR_USER,
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
