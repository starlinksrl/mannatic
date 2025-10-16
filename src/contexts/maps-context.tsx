
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useLoadScript } from '@react-google-maps/api';

const libraries: ('places' | 'drawing' | 'geometry' | 'localContext' | 'visualization')[] = ['places', 'geometry'];

interface MapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const MapsContext = createContext<MapsContextType | undefined>(undefined);

export const MapsProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: 'AIzaSyD_p2rV6qwzWGXEyjsv4BQf0k8p3Y6Tfts',
    libraries,
  });

  const value = { isLoaded, loadError };

  return (
    <MapsContext.Provider value={value}>
      {children}
    </MapsContext.Provider>
  );
};

export const useMaps = () => {
  const context = useContext(MapsContext);
  if (context === undefined) {
    throw new Error('useMaps must be used within a MapsProvider');
  }
  return context;
};
