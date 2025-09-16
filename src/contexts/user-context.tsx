"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, users } from '@/lib/data';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
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
    setIsLoading(false);
  }, []);

  const login = (email: string, password?: string): boolean => {
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };
  
  const switchUser = (userId: string) => {
    const selectedUser = users.find((u) => u.id === userId);
    if (selectedUser) {
      setUser(selectedUser);
    }
  }

  return (
    <UserContext.Provider value={{ user, setUser, login, logout, isLoading, switchUser, availableUsers: users }}>
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
