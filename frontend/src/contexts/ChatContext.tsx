import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
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
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // Summary Flow States
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false);
  const [summaryAccepted, setSummaryAccepted] = useState<boolean | null>(null);

  const resetSummaryFlow = useCallback(() => {
    setSummaryAccepted(null);
    setShowSummaryPrompt(false);
  }, []);

  const startNewSession = useCallback(() => {
    const session: ChatSession = {
      id: Date.now().toString(),
      title: 'Percakapan baru',
      preview: '',
      timestamp: new Date(),
      status: 'unsolved',
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
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSession({ ...session });
      resetSummaryFlow();
    }
  }, [sessions, resetSummaryFlow]);

  /**
   * Logika Update Pesan dengan Trigger Summary Berulang (3, 6, 9...)
   */
  const addMessageToSession = useCallback((message: ChatMessage) => {
    setCurrentSession((prev) => {
      if (!prev) return null;

      const updatedMessages = [...prev.messages, message];
      
      // 1. Logika Hitung Pesan User
      const userMsgs = updatedMessages.filter(m => m.role === 'user');
      const userCount = userMsgs.length;

      // TRIGGER SUMMARY: Setiap kelipatan 3 (3, 6, 9...) setelah BOT menjawab
      if (userCount > 0 && userCount % 3 === 0 && message.role === 'bot') {
        setShowSummaryPrompt(true);
        // Reset agar prompt dianggap "baru" untuk kelipatan ini
        setSummaryAccepted(null); 
      }

      const updatedSession = {
        ...prev,
        messages: updatedMessages,
        preview: typeof message.content === 'string' ? message.content.slice(0, 60) : 'Mengirim gambar',
        title: prev.title === 'Percakapan baru' && message.role === 'user' 
               ? message.content.slice(0, 30) 
               : prev.title
      };

      // 2. Sinkronisasi ke Sidebar History
      setSessions((prevSessions) => {
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

  const acceptSummary = (accept: boolean | null) => {
    setSummaryAccepted(accept);
    // Begitu tombol diklik (Ya atau Nanti), box prompt langsung ditutup
    setShowSummaryPrompt(false);
  };

  const markSessionSolved = (id: string, solved: boolean) => {
    const statusText = solved ? "Terselesaikan" : "Belum Terselesaikan";
    
    const systemMsg: ChatMessage = {
      id: `status-${Date.now()}`,
      role: 'bot',
      content: `📌 Masalah ditandai sebagai: **${statusText}**`,
      timestamp: new Date()
    };

    addMessageToSession(systemMsg);

    setCurrentSession(prev => {
      if (!prev) return null;
      return { ...prev, status: solved ? 'solved' : 'unsolved' };
    });

    // Pastikan flow summary benar-benar bersih agar kelipatan 3 berikutnya bisa muncul lagi
    resetSummaryFlow(); 
  };

  return (
    <ChatContext.Provider
      value={{
        sessions,
        currentSession,
        startNewSession,
        loadSession,
        addMessageToSession,
        isTyping,
        setIsTyping,
        showSummaryPrompt,
        summaryAccepted,
        acceptSummary,
        resetSummaryFlow,
        markSessionSolved
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};