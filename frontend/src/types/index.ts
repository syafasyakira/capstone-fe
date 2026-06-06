// types/index.ts
export type UserRole = 'customer' | 'customer_service' | 'admin';

export interface User {
  id: string;
  name?: string;
  full_name?: string;
  email: string;
  role: UserRole;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'cs' | 'assistant';
  content: string;
  timestamp?: Date;
  createdAt?: string;
  imageUrl?: string;
  image_url?: string;
  isSummary?: boolean;
  summaryContent?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  preview?: string;
  timestamp?: Date;
  createdAt?: string;
  updatedAt?: string;
  status: 'ai' | 'waiting_cs' | 'with_cs' | 'solved' | 'unsolved' | 'pending';
  messages?: ChatMessage[];
  escalatedToCS?: boolean;
  csActive?: boolean;
  csSolvedBy?: 'user' | 'cs' | null;
  csHandlerName?: string | null;
  assignedToCSId?: string | null;
  userId?: string;
  userName?: string;
}

export interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
}

export interface MonthlyReport {
  month: string;
  year: number;
  totalIssues: number;
  solved: number;
  pending: number;
  topIssues: string[];
}