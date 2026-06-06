// ChatContext.tsx

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { ChatMessage, ChatSession } from "@/types";
import {
  getUserChats,
  getChatHistory,
  getCSChatDetail,
  escalateToCS as escalateToCSAPI,
  getCSAutoAssignedChat,
  sendCSMessage,
  updateCSChatStatus,
} from "@/services/api";

interface ChatContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string, imageUrl?: string) => Promise<any>;
  loadSession: (sessionId: string) => Promise<void>;
  loadUserSessions: () => Promise<void>;
  loadCSEscalatedSessions: () => Promise<void>;
  escalateToCS: (sessionId: string, reason?: string) => Promise<void>;
  csClaimSession: (sessionId: string) => Promise<void>;
  csReplyToSession: (sessionId: string, message: string) => Promise<void>;
  csMarkSession: (sessionId: string, status: string) => Promise<void>;
  setCurrentChatId: (id: string | null) => void;
  resetChatSession: () => void; // FIX: Daftarkan fungsi reset di interface context
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapMessages = (rawMessages: any[]): ChatMessage[] =>
    rawMessages.map((msg: any) => ({
      id: msg.id,
      role: msg.role === 'assistant' ? 'bot' : msg.role,
      content: msg.content,
      imageUrl: msg.image_url,
      createdAt: msg.created_at,
      timestamp: new Date(msg.created_at),
    }));

  // FIX: Fungsi pembersih session aktif agar sidebar mengarah ke chat baru kosong
  const resetChatSession = useCallback(() => {
    setCurrentChatId(null);
    setCurrentSessionId(null);
  }, []);

  const loadUserSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserChats();
      const chats = data.chats || data || [];
      const sessionsFromChats: ChatSession[] = chats.map((chat: any) => ({
        id: chat.id,
        title: chat.title || `Chat ${chat.id.substring(0, 8)}`,
        preview: chat.preview,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        status: chat.status as ChatSession['status'], // FIX: Type safety cast
        messages: [],
      }));
      setSessions(sessionsFromChats);
    } catch (err: any) {
      setError(err.message || "Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCSEscalatedSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCSAutoAssignedChat();
      const csChats = data.chats || [];
      const sessionsFromChats: ChatSession[] = csChats.map((chat: any) => ({
        id: chat.id,
        title: chat.title || `Chat ${chat.id.substring(0, 8)}`,
        preview: chat.preview,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        status: chat.status as ChatSession['status'],
        messages: [],
        assignedToCSId: chat.assignedToCSId || chat.cs_id || null,
        userName: chat.userName || chat.profiles?.full_name || 'User',
        csHandlerName: chat.csHandlerName || null,
      }));
      setSessions(sessionsFromChats);
    } catch (err: any) {
      setError(err.message || "Failed to load CS sessions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load session + history untuk customer (pakai /api/chat/:id)
  const loadSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setCurrentChatId(sessionId);
    setIsLoading(true);
    setError(null);
    try {
      const data = await getChatHistory(sessionId);
      const chat = data.chat;
      const messagesFromChat = mapMessages(data.messages || []);

      setSessions((prev) => {
        const exists = prev.find((s) => s.id === sessionId);
        if (exists) {
          return prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: messagesFromChat, status: (chat?.status || s.status) as ChatSession['status'] }
              : s
          );
        }
        return [
          ...prev,
          {
            id: sessionId,
            title: chat?.title || `Chat ${sessionId.substring(0, 8)}`,
            preview: chat?.preview,
            createdAt: chat?.created_at,
            updatedAt: chat?.updated_at,
            status: (chat?.status || 'ai') as ChatSession['status'],
            messages: messagesFromChat,
          },
        ];
      });
    } catch (err: any) {
      setError(err.message || "Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const escalateToCS = useCallback(async (sessionId: string, reason?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await escalateToCSAPI(sessionId, reason);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, status: "waiting_cs" as ChatSession['status'] } : s
        )
      );
    } catch (err: any) {
      setError(err.message || "Failed to escalate to CS");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (message: string, imageUrl?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { sendMessageToAI } = await import("@/services/api");
      const result = await sendMessageToAI(message, imageUrl, [], currentChatId || undefined);

      if (result.chat_id && result.chat_id !== currentChatId) {
        setCurrentChatId(result.chat_id);
        setCurrentSessionId(result.chat_id);

        setSessions((prev) => {
          const exists = prev.find((s) => s.id === result.chat_id);
          if (exists) return prev;
          return [
            {
              id: result.chat_id,
              title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
              preview: message.substring(0, 100),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              status: (result.status || 'ai') as ChatSession['status'], 
              messages: [],
            },
            ...prev,
          ];
        });
      } else if (currentChatId) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentChatId 
              ? { ...s, status: (result.status || s.status) as ChatSession['status'] } 
              : s
          )
        );
      }

      return result;
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentChatId]);

  const csClaimSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCSChatDetail(sessionId);
      const chat = data.chat;
      const rawMessages = data.messages || [];

      const messagesFromChat: ChatMessage[] = rawMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role === 'assistant' ? 'bot' : msg.role, 
        content: msg.content,
        imageUrl: msg.image_url,
        createdAt: msg.created_at,
        timestamp: new Date(msg.created_at),
      }));

      setCurrentChatId(sessionId);
      setCurrentSessionId(sessionId);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: messagesFromChat,
                status: (chat?.status || 'with_cs') as ChatSession['status'],
                assignedToCSId: chat?.cs_id || s.assignedToCSId,
                userName: chat?.profiles?.full_name || s.userName || 'User',
              }
            : s
        )
      );
    } catch (err: any) {
      setError(err.message || "Failed to claim session");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const csReplyToSession = useCallback(async (sessionId: string, message: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await sendCSMessage(sessionId, message);
      const data = await getCSChatDetail(sessionId);
      const rawMessages = data.messages || [];
      const messagesFromChat: ChatMessage[] = rawMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role === 'assistant' ? 'bot' : msg.role,
        content: msg.content,
        imageUrl: msg.image_url,
        createdAt: msg.created_at,
        timestamp: new Date(msg.created_at),
      }));
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, messages: messagesFromChat } : s
        )
      );
    } catch (err: any) {
      setError(err.message || "Failed to reply");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const csMarkSession = useCallback(async (sessionId: string, status: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await updateCSChatStatus(sessionId, status);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, status: status as ChatSession['status'] } : s
        )
      );
    } catch (err: any) {
      setError(err.message || "Failed to mark session");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <ChatContext.Provider value={{
      sessions,
      currentSessionId,
      currentChatId,
      isLoading,
      error,
      sendMessage,
      loadSession,
      loadUserSessions,
      loadCSEscalatedSessions,
      escalateToCS,
      csClaimSession,
      csReplyToSession,
      csMarkSession,
      setCurrentChatId,
      resetChatSession, // FIX: Ekspos fungsi reset ke provider value
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}