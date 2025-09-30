

'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUserByEmail, getUserById, getCompanies, Company, getUsers } from '@/lib/data';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';

const CREATOR_USER_ID = 'user-creator';

interface UserContextType {
  user: User | null; // The currently active user (can be the original or a simulated one)
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  sessionUser: User | null; // The user who originally logged in
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  switchUser: (userId: string) => void;
  availableUsers: User[];
  creator: User | null;
  companies: Company[];
  currentCompany: Company | null;
  setCurrentCompany: React.Dispatch<React.SetStateAction<Company | null>>;
  switchCompany: (companyId: string | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const creatorUser: User = { 
  id: CREATOR_USER_ID, 
  name: 'Creator', 
  email: 'creator@mannatic.com', 
  role: 'Creator', 
  avatarUrl: 'https://i.pravatar.cc/150?u=creator', 
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      const allCompanies = await getCompanies();
      setCompanies(allCompanies);

      if (firebaseUser) {
        // User is signed in to Firebase Auth
        let appUser = await getUserById(firebaseUser.uid);
        
        // Handle special case for creator login via email
        if (!appUser && firebaseUser.email === creatorUser.email) {
            appUser = creatorUser;
        }

        if (appUser) {
          setSessionUser(appUser);
          localStorage.setItem('sessionUser', JSON.stringify(appUser));
          
          const savedSimulatedUserJson = localStorage.getItem('user');
          let simulatedUserToLoad = null;
          if (savedSimulatedUserJson) {
            const savedSimulatedUser = JSON.parse(savedSimulatedUserJson);
            // Ensure the simulated user is still valid and different from the session user
            if (savedSimulatedUser.id !== appUser.id) {
               simulatedUserToLoad = await getUserById(savedSimulatedUser.id);
            }
          }
          
          const activeUser = simulatedUserToLoad || appUser;
          setUser(activeUser);
          localStorage.setItem('user', JSON.stringify(activeUser));

          const companyIdForContext = activeUser.role === 'Creator'
                ? localStorage.getItem('companyId')
                : activeUser.companyId;

          if (companyIdForContext) {
            const company = allCompanies.find(c => c.id === companyIdForContext);
             if (company) {
                setCurrentCompany(company);
                const companyUsers = await getUsers(company.id);
                setAvailableUsers([creatorUser, ...companyUsers]);
             }
          } else {
             setAvailableUsers([creatorUser]);
          }
        }
      } else {
        // User is signed out
        setUser(null);
        setSessionUser(null);
        setCurrentCompany(null);
        localStorage.clear();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    if (!password) return false;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the rest
        return true;
    } catch(error) {
        console.error("Firebase login failed:", error);
        return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    // onAuthStateChanged will handle cleanup
    router.push('/login');
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
          setUser(creatorUser);
          localStorage.setItem('user', JSON.stringify(creatorUser));
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
    setUser,
    sessionUser,
    login, 
    logout, 
    isLoading, 
    switchUser, 
    availableUsers,
    creator: creatorUser,
    companies,
    currentCompany,
    setCurrentCompany,
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
