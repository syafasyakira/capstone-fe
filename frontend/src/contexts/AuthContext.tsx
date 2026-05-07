import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin Epson', email: 'admin@epson.com', role: 'admin' },
  { id: '2', name: 'Budi Santoso', email: 'user@epson.com', role: 'user' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, _password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const found = MOCK_USERS.find((u) => u.email === email);
    if (found) {
      setUser(found);
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const register = async (name: string, email: string, _password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const newUser: User = { id: Date.now().toString(), name, email, role: 'user' };
    setUser(newUser);
    setIsLoading(false);
    return true;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
