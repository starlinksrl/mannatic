

'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUserByEmail, getUserById, getCompanies, Company, getUsers } from '@/lib/data';
import { CREATOR_USER } from '@/lib/constants';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
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

  const handleUserSession = async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
        const userProfile = await getUserById(firebaseUser.uid);
        if (userProfile) {
            login(userProfile, userProfile); // On initial load, user and sessionUser are the same
        } else {
            console.error(`User with UID ${firebaseUser.uid} found in Auth, but not in Firestore.`);
            logout();
        }
    } else {
        // No Firebase user, check for dev creator session
        const savedUserJson = localStorage.getItem('user');
        if (savedUserJson) {
            const savedUser = JSON.parse(savedUserJson);
            if (savedUser.id === CREATOR_USER.id) {
                login(CREATOR_USER, CREATOR_USER);
            } else {
                 logout(); // Clear any invalid local state
            }
        } else {
            setIsLoading(false); // No user, not loading anymore
        }
    }
  };
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleUserSession);
    // Cleanup subscription on unmount
    return () => unsubscribe();
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
    
    // Persist only for dev creator, as Firebase handles auth persistence
    if (loggedInUser.id === CREATOR_USER.id) {
        localStorage.setItem('user', JSON.stringify(loggedInUser));
    } else {
        localStorage.removeItem('user');
    }

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
    signOut(auth);
    setUser(null);
    setSessionUser(null);
    setCurrentCompany(null);
    setAvailableUsers([]);
    localStorage.removeItem('user'); // For creator
    localStorage.removeItem('companyId');
    router.push('/login');
  };
  
  const switchUser = async (userId: string) => {
    if (sessionUser?.role !== 'Creator') return; // Only creator can switch

    const selectedUser = await getUserById(userId);
    
    if (selectedUser) {
      setUser(selectedUser);
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
          setAvailableUsers([CREATOR_USER]);
          return;
      }
      
      const company = companies.find(c => c.id === companyId);
      if (company) {
          setCurrentCompany(company);
          localStorage.setItem('companyId', companyId);
          const companyUsers = await getUsers(companyId);
          setAvailableUsers([CREATOR_USER, ...companyUsers]);
          // When creator switches company, they become the active user for that context
          if (user?.id !== CREATOR_USER.id) {
            setUser(CREATOR_USER);
          }
      }
  }

  const value = { 
    user, 
    sessionUser,
    login: (userToLogin) => login(userToLogin, userToLogin), // Simplified for external calls
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
