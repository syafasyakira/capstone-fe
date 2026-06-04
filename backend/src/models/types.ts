// Type definitions for the application

export type UserRole = 'customer' | 'admin' | 'customer_service';
export type ChatStatus = 'ai' | 'waiting_cs' | 'with_cs' | 'solved';
export type MessageRole = 'user' | 'assistant' | 'cs';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
}

export interface Chat {
  id: string;
  customer_id: string;
  cs_id?: string;
  title: string;
  preview?: string;
  status: ChatStatus;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  role: MessageRole;
  content: string;
  image_url?: string;
  created_at: string;
}

export interface RAGRequest {
  user_id: string;
  message: string;
  history: Array<{ role: string; content: string }>;
}

export interface RAGResponse {
  status: 'success' | 'error';
  reply: string;
  tokens_used?: number;
  needs_escalation?: boolean;
  error?: string;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface ChatRequest {
  message: string;
  image_url?: string;
  chat_id?: string;
}

export interface EscalationRequest {
  chat_id: string;
  reason?: string;
}
