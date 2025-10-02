

'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUserByEmail, getUserById, getCompanies, Company, getUsers } from '@/lib/data';
import { CREATOR_USER } from '@/lib/constants';

interface UserContextType {
  user: User | null; // The currently active user (can be the original or a simulated one)
  sessionUser: User | null; // The user who originally logged in
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
  switchUser: (userId: string) => void;
  availableUsers: User[];
  creator: User | null;
  companies: Company[];
  currentCompany: Company | null;
  switchCompany: (companyId: string | null) => void;
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
    const loadInitialData = async () => {
      setIsLoading(true);
      
      const allCompanies = await getCompanies();
      setCompanies(allCompanies);

      const savedUserJson = localStorage.getItem('user');
      const savedSessionUserJson = localStorage.getItem('sessionUser');

      let savedUser: User | null = null;
      let savedSessionUser: User | null = null;
      
      if (savedSessionUserJson) {
        savedSessionUser = JSON.parse(savedSessionUserJson);
        const freshSessionUser = await getUserById(savedSessionUser.id);
        setSessionUser(freshSessionUser);
      }

      if (savedUserJson) {
        savedUser = JSON.parse(savedUserJson);
        const freshUser = await getUserById(savedUser.id);
        setUser(freshUser);

        // If no session user, the logged in user is the session user
        if (!savedSessionUser) {
          setSessionUser(freshUser);
          localStorage.setItem('sessionUser', JSON.stringify(freshUser));
        }

        if (freshUser?.role === 'Creator') {
           const savedCompanyId = localStorage.getItem('companyId');
           if (savedCompanyId) {
             const company = allCompanies.find(c => c.id === savedCompanyId);
             if (company) {
                setCurrentCompany(company);
                const companyUsers = await getUsers(company.id);
                setAvailableUsers([CREATOR_USER, ...companyUsers]);
             } else {
                setAvailableUsers([CREATOR_USER]);
             }
           } else {
             setAvailableUsers([CREATOR_USER]);
           }
        } else if (freshUser) {
           const company = allCompanies.find(c => c.id === freshUser.companyId);
           setCurrentCompany(company || null);
           if (company) {
             const companyUsers = await getUsers(company.id);
             setAvailableUsers([CREATOR_USER, ...companyUsers]);
           }
        }

      }
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  const login = (loggedInUser: User) => {
    setUser(loggedInUser);
    setSessionUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    localStorage.setItem('sessionUser', JSON.stringify(loggedInUser));
    
    if (loggedInUser.role === 'Creator') {
      setCurrentCompany(null);
      localStorage.removeItem('companyId');
      setAvailableUsers([CREATOR_USER]);
    } else {
      const company = companies.find(c => c.id === loggedInUser.companyId);
      if (company) {
        setCurrentCompany(company);
        localStorage.setItem('companyId', company.id);
        getUsers(company.id).then(companyUsers => {
            setAvailableUsers([CREATOR_USER, ...companyUsers]);
        });
      }
    }
  };

  const logout = () => {
    setUser(null);
    setSessionUser(null);
    setCurrentCompany(null);
    localStorage.removeItem('user');
    localStorage.removeItem('sessionUser');
    localStorage.removeItem('companyId');
    router.push('/login');
  };
  
  const switchUser = async (userId: string) => {
    const selectedUser = await getUserById(userId);
    
    if (selectedUser) {
      setUser(selectedUser);
      localStorage.setItem('user', JSON.stringify(selectedUser));

      if(selectedUser.id === CREATOR_USER.id) {
        await switchCompany(null);
        router.push('/dashboard/companies');
        return;
      }

      if (selectedUser.companyId !== currentCompany?.id) {
          await switchCompany(selectedUser.companyId);
      }
    }
  }

  const switchCompany = async (companyId: string | null) => {
      if (companyId === null) {
          setCurrentCompany(null);
          localStorage.removeItem('companyId');
          setAvailableUsers([CREATOR_USER]);
          setUser(CREATOR_USER);
          localStorage.setItem('user', JSON.stringify(CREATOR_USER));
          return;
      }
      
      const company = companies.find(c => c.id === companyId);
      if (company && (sessionUser?.role === 'Creator')) {
          setCurrentCompany(company);
          localStorage.setItem('companyId', companyId);
          const companyUsers = await getUsers(companyId);
          setAvailableUsers([CREATOR_USER, ...companyUsers]);
          // When creator switches company, they become the active user for that context
          setUser(CREATOR_USER);
          localStorage.setItem('user', JSON.stringify(CREATOR_USER));
          router.push('/dashboard');
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
