

'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUserByEmail, getUserById, getCompanies, Company, getUsers } from '@/lib/data';
import { CREATOR_USER } from '@/lib/constants';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userProfile = await getUserById(firebaseUser.uid);
            if (userProfile) {
                // If there's a stored session user, we respect that for simulation purposes
                const savedSessionUserJson = localStorage.getItem('sessionUser');
                const sessionUserProfile = savedSessionUserJson ? JSON.parse(savedSessionUserJson) : userProfile;
                setSessionUser(sessionUserProfile);

                // If a different user was being simulated, keep them as the active user
                const savedUserJson = localStorage.getItem('user');
                const activeUser = savedUserJson ? JSON.parse(savedUserJson) : userProfile;
                
                login(activeUser); // Use login function to set all states correctly
            } else {
                 logout(); // User in auth but not in our DB
            }
        } else {
            // Check for Creator session in local storage (dev only)
            const savedUserJson = localStorage.getItem('user');
            if (savedUserJson) {
                const savedUser = JSON.parse(savedUserJson);
                if (savedUser.id === CREATOR_USER.id) {
                    login(CREATOR_USER);
                } else {
                    logout();
                }
            } else {
                setIsLoading(false);
            }
        }
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const fetchCompanies = async () => {
      const allCompanies = await getCompanies();
      setCompanies(allCompanies);
    };
    fetchCompanies();
  }, []);

  const login = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));

    if (loggedInUser.role === 'Creator') {
        setSessionUser(CREATOR_USER);
        localStorage.setItem('sessionUser', JSON.stringify(CREATOR_USER));
        const companyId = localStorage.getItem('companyId');
        if(companyId) {
           switchCompany(companyId);
        } else {
           setCurrentCompany(null);
           setAvailableUsers([CREATOR_USER]);
        }
    } else {
        // If the loggedInUser is not the Creator, the session user must be them
        const sessionUserFromStorage = localStorage.getItem('sessionUser');
        if(sessionUserFromStorage) {
            const parsed = JSON.parse(sessionUserFromStorage);
            if(parsed.id !== loggedInUser.id) {
                setSessionUser(parsed)
            } else {
                 setSessionUser(loggedInUser);
                 localStorage.setItem('sessionUser', JSON.stringify(loggedInUser));
            }
        } else {
            setSessionUser(loggedInUser);
            localStorage.setItem('sessionUser', JSON.stringify(loggedInUser));
        }

        const company = companies.find(c => c.id === loggedInUser.companyId);
        if (company) {
            setCurrentCompany(company);
            localStorage.setItem('companyId', company.id);
            getUsers(company.id).then(companyUsers => {
                setAvailableUsers([CREATOR_USER, ...companyUsers]);
            });
        }
    }
     setIsLoading(false);
  };

  const logout = () => {
    signOut(auth);
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
