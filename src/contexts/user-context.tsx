
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, getUserByEmail, getUserById, getAllUsers, getCompanies, Company } from '@/lib/data';

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
  email: 'creator@schedulapro.com', 
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
  
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      const allDbUsers = await getAllUsers();
      setAvailableUsers([creatorUser, ...allDbUsers]);
      
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
             setCurrentCompany(company || null);
           }
        } else if (freshUser) {
           const company = allCompanies.find(c => c.id === freshUser.companyId);
           setCurrentCompany(company || null);
        }

      }
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    let foundUser: User | null = null;
    if (email.toLowerCase() === creatorUser.email && password === creatorUser.password) {
      foundUser = creatorUser;
    } else {
      foundUser = await getUserByEmail(email);
      if (foundUser?.password !== password) foundUser = null;
    }
    
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('user', JSON.stringify(foundUser));

      if (foundUser.role === 'Creator') {
        // Don't auto-select a company for the creator on login
        setCurrentCompany(null);
        localStorage.removeItem('companyId');
      } else {
        const company = companies.find(c => c.id === foundUser?.companyId);
        setCurrentCompany(company || null);
         if (company) localStorage.setItem('companyId', company.id);
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
    let selectedUser: User | null = null;
    if (userId === creatorUser.id) {
        selectedUser = creatorUser;
    } else {
        selectedUser = await getUserById(userId);
    }
    
    if (selectedUser) {
      setUser(selectedUser);
      localStorage.setItem('user', JSON.stringify(selectedUser));

      // When switching user, also switch company context
      if (selectedUser.role === 'Creator') {
         if(!currentCompany) {
            const firstCompany = companies[0];
            if(firstCompany) switchCompany(firstCompany.id)
         }
      } else {
        switchCompany(selectedUser.companyId);
      }
    }
  }

  const switchCompany = (companyId: string) => {
      const company = companies.find(c => c.id === companyId);
      if (company && user?.role === 'Creator') {
          setCurrentCompany(company);
          localStorage.setItem('companyId', company.id);
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
