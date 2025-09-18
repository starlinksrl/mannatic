

'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUserByEmail, getUserById, getAllUsers, getCompanies, Company, getUsers } from '@/lib/data';

const CREATOR_USER_ID = 'user-creator';

interface UserContextType {
  user: User | null; // The currently active user (can be the original or a simulated one)
  sessionUser: User | null; // The user who originally logged in
  login: (email: string, password?: string) => Promise<boolean>;
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

      let userToLoad: User | null = null;
      let sessionUserToLoad: User | null = null;
      
      if (savedSessionUserJson) {
          sessionUserToLoad = JSON.parse(savedSessionUserJson);
          const freshSessionUser = await getUserById(sessionUserToLoad!.id);
          setSessionUser(freshSessionUser);
      }

      if (savedUserJson) {
        userToLoad = JSON.parse(savedUserJson);
        const freshUser = await getUserById(userToLoad!.id);
        setUser(freshUser);

        // If no session user, the logged in user is the session user
        if (!sessionUserToLoad) {
          setSessionUser(freshUser);
          if (freshUser) {
            localStorage.setItem('sessionUser', JSON.stringify(freshUser));
          }
        }

        const activeUserForContext = freshUser || sessionUserToLoad;

        if (activeUserForContext) {
            const companyIdForContext = activeUserForContext.role === 'Creator'
                ? localStorage.getItem('companyId')
                : activeUserForContext.companyId;

            if (companyIdForContext) {
                const company = allCompanies.find(c => c.id === companyIdForContext);
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
        }
      }
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase();
    let foundUser: User | null = null;
    
    if (normalizedEmail === creatorUser.email.toLowerCase() && password === creatorUser.password) {
      foundUser = creatorUser;
    } else {
      foundUser = await getUserByEmail(normalizedEmail);
      if (foundUser?.password !== password) foundUser = null;
    }
    
    if (foundUser) {
      setUser(foundUser);
      setSessionUser(foundUser);
      localStorage.setItem('user', JSON.stringify(foundUser));
      localStorage.setItem('sessionUser', JSON.stringify(foundUser));


      if (foundUser.role === 'Creator') {
        setCurrentCompany(null);
        localStorage.removeItem('companyId');
        setAvailableUsers([creatorUser]);
        router.push('/dashboard/companies');
      } else {
        const company = companies.find(c => c.id === foundUser?.companyId);
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
    setSessionUser(null);
    setCurrentCompany(null);
    localStorage.removeItem('user');
    localStorage.removeItem('sessionUser');
    localStorage.removeItem('companyId');
  };
  
  const switchUser = async (userId: string) => {
    const selectedUser = await getUserById(userId);
    
    if (selectedUser) {
      setUser(selectedUser);
      localStorage.setItem('user', JSON.stringify(selectedUser));

      if(selectedUser.id === CREATOR_USER_ID) {
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
          setAvailableUsers([creatorUser]);
          return;
      }
      
      const company = companies.find(c => c.id === companyId);
      if (company && (sessionUser?.role === 'Creator')) {
          setCurrentCompany(company);
          localStorage.setItem('companyId', companyId);
          const companyUsers = await getUsers(companyId);
          setAvailableUsers([creatorUser, ...companyUsers]);
          // When creator switches company, they become the active user for that context
          setUser(creatorUser);
          localStorage.setItem('user', JSON.stringify(creatorUser));
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
