// types/index.ts
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  status: 'solved' | 'unsolved';
  messages: ChatMessage[];
}

export interface MonthlyReport {
  month: string;
  year: number;
  totalIssues: number;
  solved: number;
  pending: number;
  topIssues: string[];
}
