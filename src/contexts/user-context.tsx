"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, users } from '@/lib/data';

interface UserContextType {
  user: User | null;
  login: (email: string, password?: string) => boolean;
  logout: () => void;
  isLoading: boolean;
  switchUser: (userId: string) => void;
  availableUsers: User[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // In a real app, you'd check for a token in localStorage
  useEffect(() => {
    // Try to load user from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, password?: string): boolean => {
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (foundUser) {
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
  
  const switchUser = (userId: string) => {
    const selectedUser = users.find((u) => u.id === userId);
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
    availableUsers: users,
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
