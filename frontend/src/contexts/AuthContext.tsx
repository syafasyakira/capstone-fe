import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  // Admin: tambah akun CS
  addCSUser: (name: string, email: string, password: string) => Promise<boolean>;
  removeCSUser: (id: string) => void;
  csUsers: User[];
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock users — nanti diganti dengan hit backend
const INITIAL_MOCK_USERS: (User & { password: string })[] = [
  { id: '1', name: 'Admin Epson', email: 'admin@epson.com', role: 'admin', password: 'admin123' },
  { id: '2', name: 'Budi Santoso', email: 'user@epson.com', role: 'user', password: 'user123' },
  { id: '3', name: 'John CS', email: 'cs@epson.com', role: 'cs', password: 'cs123' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mockUsers, setMockUsers] = useState(INITIAL_MOCK_USERS);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const found = mockUsers.find((u) => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...userWithoutPassword } = found;
      setUser(userWithoutPassword);
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const register = async (name: string, email: string, _password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const exists = mockUsers.find(u => u.email === email);
    if (exists) { setIsLoading(false); return false; }
    const newUser: User & { password: string } = {
      id: Date.now().toString(),
      name,
      email,
      role: 'user',
      password: _password,
    };
    setMockUsers(prev => [...prev, newUser]);
    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    setIsLoading(false);
    return true;
  };

  // Hanya admin yang bisa panggil ini
  const addCSUser = async (name: string, email: string, password: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 400));
    const exists = mockUsers.find(u => u.email === email);
    if (exists) return false;
    const newCS: User & { password: string } = {
      id: Date.now().toString(),
      name,
      email,
      role: 'cs',
      password,
    };
    setMockUsers(prev => [...prev, newCS]);
    return true;
  };

  const removeCSUser = (id: string) => {
    setMockUsers(prev => prev.filter(u => u.id !== id));
  };

  const csUsers = mockUsers
    .filter(u => u.role === 'cs')
    .map(({ password: _, ...u }) => u);

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, addCSUser, removeCSUser, csUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
