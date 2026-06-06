import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/types';
import { loginAPI, registerAPI, createCSUser, deleteCSUser, updateCSUser as updateCSUserAPI, getCSUsers } from '@/services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  addCSUser: (name: string, email: string, password: string) => Promise<boolean>;
  removeCSUser: (id: string) => Promise<boolean>;
  updateCSUser: (id: string, name: string, email: string, password?: string) => Promise<boolean>;
  csUsers: User[];
  refreshCSUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [csUsers, setCsUsers] = useState<User[]>([]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const data = await loginAPI(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const data = await registerAPI(name, email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Register error:', err);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCsUsers([]);
  };

  const refreshCSUsers = async () => {
    try {
      const data = await getCSUsers();
      const csList = (data.users || []).filter((u: any) => u.role === 'customer_service');
      setCsUsers(csList);
    } catch (err) {
      console.error('Failed to fetch CS users:', err);
    }
  };

  const addCSUser = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      await createCSUser(email, password, name);
      await refreshCSUsers();
      return true;
    } catch (err) {
      console.error('Add CS error:', err);
      return false;
    }
  };

  const removeCSUser = async (id: string): Promise<boolean> => {
    try {
      await deleteCSUser(id);
      setCsUsers(prev => prev.filter(u => u.id !== id));
      return true;
    } catch (err) {
      console.error('Remove CS error:', err);
      return false;
    }
  };

  const updateCSUser = async (id: string, name: string, email: string, password?: string): Promise<boolean> => {
    try {
      await updateCSUserAPI(id, name, email, password);
      await refreshCSUsers();
      return true;
    } catch (err) {
      console.error('Update CS error:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, addCSUser, removeCSUser, updateCSUser, csUsers, refreshCSUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}