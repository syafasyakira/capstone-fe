import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, ChatSession } from '@/types';

interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  startNewSession: () => void;
  loadSession: (sessionId: string) => void;
  addMessageToSession: (message: ChatMessage) => void;
  isTyping: boolean;
  setIsTyping: (status: boolean) => void;
  showSummaryPrompt: boolean;
  summaryAccepted: boolean | null;
  acceptSummary: (accept: boolean) => void;
  resetSummaryFlow: () => void;
  markSessionSolved: (id: string, solved: boolean) => void;
  escalateToCS: (sessionId: string) => void;
  // CS functions
  csReplyToSession: (sessionId: string, message: string, handlerName?: string) => void;
  csMarkSession: (sessionId: string, solved: boolean) => void;
  csClaimSession: (sessionId: string, csId: string, csName: string) => boolean;
  getEscalatedSessions: () => ChatSession[];
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  // ✅ Menggunakan array kosong sebagai inisialisasi awal
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false);
  const [summaryAccepted, setSummaryAccepted] = useState<boolean | null>(null);
  const summaryDoneRef = useRef(false);

  // CONTOH: Jika Anda ingin mengambil data dari API/Backend nantinya
  /*
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/chat-sessions'); // Ganti dengan endpoint Anda
        const data = await response.json();
        setSessions(data);
      } catch (error) {
        console.error("Gagal memuat sesi chat:", error);
      }
    };
    fetchSessions();
  }, []);
  */

  const resetSummaryFlow = useCallback(() => {
    setSummaryAccepted(null);
    setShowSummaryPrompt(false);
    summaryDoneRef.current = false;
  }, []);

  const startNewSession = useCallback(() => {
    const session: ChatSession = {
      id: Date.now().toString(),
      title: 'Percakapan baru',
      preview: '',
      timestamp: new Date(),
      status: 'pending',
      escalatedToCS: false,
      csActive: false,
      csHandlerName: null,
      assignedToCSId: null,
      messages: [
        {
          id: 'welcome',
          role: 'bot',
          content: 'Halo! Saya adalah EPSON AI Assistant. Ada yang bisa saya bantu hari ini?',
          timestamp: new Date(),
        },
      ],
    };
    setCurrentSession(session);
    setSessions(prev => [session, ...prev]);
    resetSummaryFlow();
  }, [resetSummaryFlow]);

  const loadSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const session = prev.find((s) => s.id === sessionId);
      if (session) setCurrentSession({ ...session });
      return prev;
    });
    resetSummaryFlow();
  }, [resetSummaryFlow]);

  const addMessageToSession = useCallback((message: ChatMessage) => {
    setCurrentSession((prev) => {
      if (!prev) return null;
      const updatedMessages = [...prev.messages, message];
      const userCount = updatedMessages.filter(m => m.role === 'user').length;

      if (!prev.csActive && userCount > 0 && userCount % 3 === 0 && message.role === 'bot' && !summaryDoneRef.current) {
        setShowSummaryPrompt(true);
        setSummaryAccepted(null);
      }

      const updatedSession: ChatSession = {
        ...prev,
        messages: updatedMessages,
        preview: typeof message.content === 'string' ? message.content.slice(0, 60) : 'Mengirim gambar',
        title: prev.title === 'Percakapan baru' && message.role === 'user'
          ? message.content.slice(0, 30)
          : prev.title,
      };

      setSessions(prevSessions => {
        const index = prevSessions.findIndex(s => s.id === prev.id);
        if (index !== -1) {
          const newSessions = [...prevSessions];
          newSessions[index] = updatedSession;
          return newSessions;
        }
        return [updatedSession, ...prevSessions];
      });

      return updatedSession;
    });
  }, []);

  const acceptSummary = (accept: boolean) => {
    setSummaryAccepted(accept);
    setShowSummaryPrompt(false);
    if (accept) summaryDoneRef.current = true;
  };

  const markSessionSolved = (id: string, solved: boolean) => {
    const update = (s: ChatSession): ChatSession => ({
      ...s,
      status: solved ? 'solved' : 'unsolved',
      csActive: solved ? false : s.csActive,
      csSolvedBy: solved ? 'user' : null,
    });
    setSessions(prev => prev.map(s => s.id === id ? update(s) : s));
    setCurrentSession(prev => prev?.id === id ? update(prev) : prev);
    resetSummaryFlow();
  };

  const escalateToCS = useCallback((sessionId: string) => {
    const notifMsg: ChatMessage = {
      id: `cs-notif-${Date.now()}`,
      role: 'bot',
      content: 'Percakapan anda sedang diteruskan ke Customer Service kami, mohon tunggu untuk beberapa saat...',
      timestamp: new Date(),
    };
    const update = (s: ChatSession): ChatSession => ({
      ...s,
      escalatedToCS: true,
      csActive: true,
      status: 'unsolved',
      messages: [...s.messages, notifMsg],
      preview: notifMsg.content,
    });
    setSessions(prev => prev.map(s => s.id === sessionId ? update(s) : s));
    setCurrentSession(prev => prev?.id === sessionId ? update(prev) : prev);
  }, []);

  const csClaimSession = useCallback((sessionId: string, csId: string, csName: string): boolean => {
    let success = false;
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === sessionId);
      if (idx === -1) return prev;
      const session = prev[idx];
      // Sudah diklaim CS lain
      if (session.assignedToCSId && session.assignedToCSId !== csId) return prev;
      success = true;
      const updated: ChatSession = { ...session, assignedToCSId: csId, csHandlerName: csName };
      const newSessions = [...prev];
      newSessions[idx] = updated;
      return newSessions;
    });
    return success;
  }, []);

  const csReplyToSession = useCallback((sessionId: string, message: string, handlerName?: string) => {
    const csMsg: ChatMessage = {
      id: `cs-reply-${Date.now()}`,
      role: 'cs',
      content: message,
      timestamp: new Date(),
    };
    const update = (s: ChatSession): ChatSession => ({
      ...s,
      messages: [...s.messages, csMsg],
      preview: message.slice(0, 60),
      csHandlerName: handlerName ?? s.csHandlerName ?? null,
    });
    setSessions(prev => prev.map(s => s.id === sessionId ? update(s) : s));
    setCurrentSession(prev => prev?.id === sessionId ? update(prev) : prev);
  }, []);

  const csMarkSession = useCallback((sessionId: string, solved: boolean) => {
    const label = solved ? 'Terselesaikan' : 'Tidak Terselesaikan';
    const csMsg: ChatMessage = {
      id: `cs-status-${Date.now()}`,
      role: 'cs',
      content: `✅ Customer Service menandai percakapan ini sebagai: **${label}**`,
      timestamp: new Date(),
    };
    const update = (s: ChatSession): ChatSession => ({
      ...s,
      messages: [...s.messages, csMsg],
      status: solved ? 'solved' : 'unsolved',
      csActive: false,
      csSolvedBy: 'cs',
      preview: csMsg.content,
    });
    setSessions(prev => prev.map(s => s.id === sessionId ? update(s) : s));
    setCurrentSession(prev => prev?.id === sessionId ? update(prev) : prev);
  }, []);

  const getEscalatedSessions = useCallback((): ChatSession[] => {
    return sessions.filter(s => s.escalatedToCS);
  }, [sessions]);

  return (
    <ChatContext.Provider value={{
      sessions, currentSession, startNewSession, loadSession,
      addMessageToSession, isTyping, setIsTyping,
      showSummaryPrompt, summaryAccepted, acceptSummary, resetSummaryFlow,
      markSessionSolved, escalateToCS,
      csReplyToSession, csMarkSession, csClaimSession, getEscalatedSessions,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};