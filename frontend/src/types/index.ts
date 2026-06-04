// types/index.ts
export type UserRole = 'user' | 'admin' | 'cs';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'cs';
  content: string;
  timestamp: Date;
  imageUrl?: string;
  isSummary?: boolean;
  summaryContent?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  status: 'solved' | 'unsolved' | 'pending';
  messages: ChatMessage[];
  escalatedToCS?: boolean;
  csActive?: boolean;
  csSolvedBy?: 'user' | 'cs' | null;
  csHandlerName?: string | null;
  assignedToCSId?: string | null; // ID CS yang claim sesi ini
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
