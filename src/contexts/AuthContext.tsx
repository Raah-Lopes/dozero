import React, { createContext, useContext, useEffect, useState } from 'react';
import { pb } from '../services/pb';
import type { RecordModel, AuthModel } from 'pocketbase';

interface AuthContextType {
  user: RecordModel | AuthModel | null;
  isLoggedIn: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RecordModel | AuthModel | null>(pb.authStore.model);

  useEffect(() => {
    // Sync React state with PocketBase authStore on mount and when it changes
    setUser(pb.authStore.model);

    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const logout = () => {
    pb.authStore.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: pb.authStore.isValid, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
