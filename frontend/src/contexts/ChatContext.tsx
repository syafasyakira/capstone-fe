import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from "react";
import { ChatMessage, ChatSession } from "@/types";
import { getUserChats, getChatHistory, escalateToCS as escalateToCSAPI, getCSAutoAssignedChat, sendCSMessage, updateCSChatStatus } from "@/services/api";

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatIdMap = useRef<Map<string, string>>(new Map());

  const loadUserSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const chats = await getUserChats();
      const sessionsFromChats: ChatSession[] = chats.map((chat: any) => ({
        id: chat.id,
        title: chat.title || `Chat ${chat.id}`,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        status: chat.status,
      }));
      chatIdMap.current.clear();
      sessionsFromChats.forEach((s) => {
        const chatId = chats.find((c: any) => c.id === s.id)?.chat_id;
        if (chatId) chatIdMap.current.set(s.id, chatId);
      });
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
        title: chat.title || `Chat ${chat.id}`,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        status: chat.status,
      }));
      chatIdMap.current.clear();
      sessionsFromChats.forEach((s) => {
        const chatId = csChats.find((c: any) => c.id === s.id)?.chat_id;
        if (chatId) chatIdMap.current.set(s.id, chatId);
      });
      setSessions(sessionsFromChats);
    } catch (err: any) {
      setError(err.message || "Failed to load CS sessions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setCurrentChatId(chatIdMap.current.get(sessionId) || null);
    setIsLoading(true);
    setError(null);
    try {
      const backendChatId = chatIdMap.current.get(sessionId) || sessionId;
      const data = await getChatHistory(backendChatId);
      const chat = data.chat;
      const messagesFromChat: ChatMessage[] = (chat.messages || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        imageUrl: msg.image_url,
        createdAt: msg.created_at,
      }));
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: messagesFromChat }
            : s
        )
      );
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
      const backendChatId = chatIdMap.current.get(sessionId) || sessionId;
      await escalateToCSAPI(backendChatId, reason);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, status: "waiting_cs" } : s
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
      if (currentChatId) {
        setCurrentChatId(result.chat_id || currentChatId);
        chatIdMap.current.set(currentSessionId || "", result.chat_id);
      }
      return result;
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentChatId, currentSessionId]);

  const csClaimSession = useCallback(async (sessionId: string) => {
    try {
      const backendChatId = chatIdMap.current.get(sessionId) || sessionId;
      const data = await getCSAutoAssignedChat();
      const chat = data.chats?.find((c: any) => c.id === backendChatId || c.chat_id === backendChatId);
      if (chat) {
        setCurrentChatId(chat.chat_id || chat.id);
        chatIdMap.current.set(sessionId, chat.chat_id || chat.id);
      }
    } catch (err: any) {
      console.error("Claim session error:", err);
    }
  }, []);

  const csReplyToSession = useCallback(async (sessionId: string, message: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const backendChatId = chatIdMap.current.get(sessionId) || sessionId;
      await sendCSMessage(backendChatId, message);
      const data = await getChatHistory(backendChatId);
      const messagesFromChat: ChatMessage[] = (data.chat?.messages || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        imageUrl: msg.image_url,
        createdAt: msg.created_at,
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
      const backendChatId = chatIdMap.current.get(sessionId) || sessionId;
      await updateCSChatStatus(backendChatId, status);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, status } : s
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
