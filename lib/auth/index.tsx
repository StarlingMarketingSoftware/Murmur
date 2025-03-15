'use client';

import React, { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';

// Define a type for the user context
type UserContextType = {
  user: any | null;
  loading: boolean;
};

// Create a context with a default value
const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
});

// Create a provider component that uses NextAuth's useSession
export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  
  const value = {
    user: session?.user || null,
    loading: status === 'loading',
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Create a hook to use the user context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
