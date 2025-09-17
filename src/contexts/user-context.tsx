'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, getUserByEmail, getUserById, getUsers } from '@/lib/data';

interface UserContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  switchUser: (userId: string) => void;
  availableUsers: User[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const universalAdmin: User = { 
  id: 'user-sbi', 
  name: 'Frank SBI', 
  email: 'franksbi', 
  role: 'Admin', 
  avatarUrl: 'https://i.pravatar.cc/150?u=user-sbi', 
  password: 'acidosbi' 
};


export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      // Fetch all users for the user switcher
      const allDbUsers = await getUsers();
      setAvailableUsers([...allDbUsers, universalAdmin]);

      // Try to load user from localStorage
      const savedUserJson = localStorage.getItem('user');
      if (savedUserJson) {
        const savedUser = JSON.parse(savedUserJson);
        // Ensure user data is up-to-date
        const freshUser = await getUserById(savedUser.id);
        setUser(freshUser || (savedUser.id === universalAdmin.id ? universalAdmin : null));
      }
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    // Hardcoded special user
    if (email.toLowerCase() === universalAdmin.email && password === universalAdmin.password) {
      setUser(universalAdmin);
      localStorage.setItem('user', JSON.stringify(universalAdmin));
      return true;
    }

    const foundUser = await getUserByEmail(email);
    if (foundUser && foundUser.password === password) {
      setUser(foundUser);
      localStorage.setItem('user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };
  
  const switchUser = async (userId: string) => {
    let selectedUser: User | null = null;
    if (userId === universalAdmin.id) {
        selectedUser = universalAdmin;
    } else {
        selectedUser = await getUserById(userId);
    }
    
    if (selectedUser) {
      setUser(selectedUser);
      localStorage.setItem('user', JSON.stringify(selectedUser));
    }
  }

  const value = { 
    user, 
    login, 
    logout, 
    isLoading, 
    switchUser, 
    availableUsers,
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
