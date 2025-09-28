
'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { Intervention } from '@/lib/types';

interface InterventionModalContextType {
  intervention: Intervention | null;
  isOpen: boolean;
  openModal: (intervention: Intervention) => void;
  closeModal: () => void;
}

const InterventionModalContext = createContext<InterventionModalContextType | undefined>(undefined);

export const InterventionModalProvider = ({ children }: { children: ReactNode }) => {
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback((interventionToOpen: Intervention) => {
    setIntervention(interventionToOpen);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setIntervention(null);
  }, []);

  const value = { intervention, isOpen, openModal, closeModal };

  return (
    <InterventionModalContext.Provider value={value}>
      {children}
    </InterventionModalContext.Provider>
  );
};

export const useInterventionModal = () => {
  const context = useContext(InterventionModalContext);
  if (context === undefined) {
    throw new Error('useInterventionModal must be used within a InterventionModalProvider');
  }
  return context;
};
