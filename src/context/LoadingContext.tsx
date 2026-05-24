import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  loadingKeys: Record<string, boolean>;
  setLoadingKey: (key: string, value: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});

  const setLoadingKey = (key: string, value: boolean) => {
    setLoadingKeys(prev => ({ ...prev, [key]: value }));
  };

  return (
    <LoadingContext.Provider value={{
      isLoading,
      setLoading: setIsLoading,
      loadingKeys,
      setLoadingKey
    }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) throw new Error('useLoading must be used within LoadingProvider');
  return context;
};
