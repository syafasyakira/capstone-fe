// src/components/chat/ChatPage.tsx

import React, { useEffect, useRef, useState } from 'react';
import { BotMessageSquare, PlusCircle, Headphones } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { SidebarNav } from '@/components/layout/AppLayout';
import MessageBubble from '@/components/chat/MessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ChatInput from '@/components/chat/ChatInput';
import SummaryBubble from '@/components/chat/SummaryBubble';
import FAQPanel from '@/components/chat/FAQPanel';
import { ChatMessage } from '@/types';
import { getAISummary, getChatHistory, generateCSSummary } from '@/services/api';
import { useParams, useNavigate } from 'react-router-dom';

const QUICK_REPLIES = ['Printer tidak dapat mencetak', 'Cara install driver', 'Cara mengisi tinta'];

interface ExtendedMessage extends ChatMessage {
  isSummary?: boolean;
  summaryContent?: string;
  isCSHandover?: boolean;
}

type ResolvedState = 'none' | 'solved' | 'unsolved';

interface ChatPageProps {
  onNavigate: (path: string) => void;
}

export default function ChatPage({ onNavigate }: ChatPageProps) {
  const {
    sessions, currentSessionId, currentChatId,
    sendMessage, loadSession, loadUserSessions, escalateToCS,
    setCurrentChatId,
    isLoading, error,
  } = useChat();

  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();

  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [resolvedActionMsgId, setResolvedActionMsgId] = useState<string | null>(null);
  const [resolvedState, setResolvedState] = useState<ResolvedState>('none');
  const pendingResolvedMsgId = useRef<string | null>(null);
  const [showEscalationText, setShowEscalationText] = useState(false);
  const [summaryAccepted, setSummaryAccepted] = useState(false);
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const initialized = useRef(false);

  // Ref agar polling & handler selalu baca nilai terbaru tanpa re-create interval
  const currentChatIdRef = useRef<string | null>(null);
  useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);

  const loadedSessionIdRef = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref untuk melacak apakah sudah ada summary di sesi ini
  const summaryShownRef = useRef(false);
  // Ref untuk track apakah summary CS sudah ditampilkan ke customer
  const csSummaryShownRef = useRef(false);

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadUserSessions();
  }, []);

  // FIX 1: Bersihkan state jika masuk ke rute /chat polosan tanpa parameter URL
  useEffect(() => {
    if (!urlSessionId) {
      setMessages([]);
      setCurrentSession(null);
      loadedSessionIdRef.current = null;
      summaryShownRef.current = false;
      setShowSummaryPrompt(false);
      return;
    }
    if (loadedSessionIdRef.current === urlSessionId) return;

    // Check if session already has messages in context — show immediately without waiting for API
    const existingSession = sessions.find(s => s.id === urlSessionId);
    if (existingSession && existingSession.messages && existingSession.messages.length > 0) {
      setMessages(existingSession.messages.map((m: ChatMessage) => ({ ...m })));
      setCurrentSession(existingSession);
      loadedSessionIdRef.current = urlSessionId;
      checkAndShowSummaryPrompt(existingSession.messages.map((m: ChatMessage) => ({ ...m })));
      return;
    }

    // Load session data (async) — messages will be set via the sessions effect below
    loadSession(urlSessionId);
  }, [urlSessionId, sessions]);

  // FIX 2: Bersihkan layar jika currentSessionId diset null oleh resetChatSession() di sidebar
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      setCurrentSession(null);
      loadedSessionIdRef.current = null;
      summaryShownRef.current = false;
      setShowSummaryPrompt(false);
      return;
    }

    if (loadedSessionIdRef.current === currentSessionId) return;

    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
      setCurrentSession(session);
      const msgs = (session.messages || []).map((m: ChatMessage) => ({ ...m }));
      if (msgs.length > 0) {
        // Jangan overwrite kalau session ini sudah di-handle handleSend (loadedSessionIdRef sudah diset)
        if (loadedSessionIdRef.current !== currentSessionId) {
          setMessages(msgs);
          loadedSessionIdRef.current = currentSessionId;
          summaryShownRef.current = false;
          checkAndShowSummaryPrompt(msgs);
        }
      } else if (loadedSessionIdRef.current !== currentSessionId) {
        setMessages([]);
      }
    }
  }, [currentSessionId, sessions]);

  // Update metadata session (status, dll) tanpa overwrite messages
  useEffect(() => {
    if (!currentSessionId) return;
    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
      setCurrentSession((prev: any) => ({
        ...session,
        messages: session.messages?.length ? session.messages : prev?.messages,
        csHandlerName: session.csHandlerName || prev?.csHandlerName,
      }));
    }
  }, [sessions, currentSessionId]);

  // Polling HANYA aktif saat CS mode (with_cs / waiting_cs)
  const isCSMode = currentSession?.status === 'with_cs' || currentSession?.status === 'waiting_cs';
  const isSolved = currentSession?.status === 'solved';

  useEffect(() => {
    const chatId = currentChatId || currentSessionId;

    if (!isCSMode || !chatId || isSolved) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const pollMessages = async () => {
      if (isTyping) return;
      try {
        const data = await getChatHistory(chatId);
        const newMsgs: ChatMessage[] = (data.messages || []).map((msg: any) => ({
          id: msg.id,
          role: msg.role === 'assistant' ? 'bot' : msg.role,
          content: msg.content,
          imageUrl: msg.image_url,
          createdAt: msg.created_at,
          timestamp: new Date(msg.created_at),
        }));

        setMessages(prev => {
          const prevIds = new Set(prev.filter(m => !m.isSummary).map(m => m.id));
          const hasNew = newMsgs.some(m => !prevIds.has(m.id));
          if (!hasNew) return prev;

          const summaries = prev.filter(m => m.isSummary);
          const merged = [...newMsgs, ...summaries].sort((a, b) => {
            const ta = a.isSummary ? Infinity : new Date(a.createdAt || a.timestamp || 0).getTime();
            const tb = b.isSummary ? Infinity : new Date(b.createdAt || b.timestamp || 0).getTime();
            return ta - tb;
          });
          return merged;
        });

        if (data.chat) {
          const newStatus = data.chat.status;
          const csNameFromBackend = data.chat.cs?.full_name || data.chat.cs_name || null;

          setCurrentSession((prev: any) =>
            prev ? { ...prev, status: newStatus, csHandlerName: csNameFromBackend || prev.csHandlerName } : prev
          );

          // Saat CS tandai solved -> fetch summary CS dan tampilkan ke customer
          if (newStatus === 'solved' && !csSummaryShownRef.current) {
            csSummaryShownRef.current = true;
            try {
              const result = await generateCSSummary(chatId);
              if (result.summary) {
                const summaryMsg = {
                  id: `cs-summary-${Date.now()}`,
                  role: 'bot' as const,
                  content: result.summary,
                  timestamp: new Date(),
                  isSummary: true,
                  summaryContent: result.summary,
                  isCSHandover: true,
                };
                setMessages(prev => [...prev.filter(m => !m.isCSHandover), summaryMsg]);
              }
            } catch {
              // silent fail
            }
          }
        }
      } catch {
        // silent fail
      }
    };

    pollingRef.current = setInterval(pollMessages, 3000);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isCSMode, currentChatId, currentSessionId, isTyping, isSolved]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timeout);
  }, [messages, isTyping, showSummaryPrompt, resolvedActionMsgId, showEscalationText]);

  useEffect(() => {
    if (!isTyping && pendingResolvedMsgId.current) {
      setResolvedActionMsgId(pendingResolvedMsgId.current);
      setResolvedState('none');
      pendingResolvedMsgId.current = null;
    }
  }, [isTyping]);

  // Buat ringkasan setelah user setuju
  useEffect(() => {
    const run = async () => {
      if (summaryAccepted !== true || !currentSession) return;
      setIsTyping(true);
      try {
        const chatHistory = messages
          .filter((m: any) => !m.isSummary && m.id !== 'welcome' && !m.id?.startsWith('err-'))
          .map((m: any) => ({
            role: m.role === 'bot' ? 'assistant' : m.role,
            content: typeof m.content === 'string' ? m.content : 'User mengirimkan gambar',
          }));
        const response = await getAISummary(chatHistory);
        const newMsg: ExtendedMessage = {
          id: `summary-${Date.now()}`,
          role: 'bot',
          content: response.message,
          timestamp: new Date(),
          isSummary: true,
          summaryContent: response.message,
        };
        setMessages(prev => [...prev, newMsg]);
        setShowSummaryPrompt(false);
        summaryShownRef.current = true;
      } catch (err) {
        console.error('Gagal membuat summary:', err);
      } finally {
        setIsTyping(false);
        setSummaryAccepted(false);
      }
    };
    run();
  }, [summaryAccepted]);

  // Helper cek kelipatan 6, hanya tampilkan jika belum ada summary
  const checkAndShowSummaryPrompt = (msgs: ExtendedMessage[]) => {
    if (summaryShownRef.current) {
      setShowSummaryPrompt(false);
      return;
    }
    const realMsgs = msgs.filter(m => !m.isSummary && m.id !== 'welcome' && !m.id?.startsWith('err-'));
    const count = realMsgs.length;
    setShowSummaryPrompt(count > 0 && count % 6 === 0);
  };

  const handleSend = async (content: string, imageUrl?: string) => {
    if (isSolved) return;

    setShowSummaryPrompt(false);
    setResolvedActionMsgId(null);
    setResolvedState('none');
    setShowEscalationText(false);
    pendingResolvedMsgId.current = null;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date(), imageUrl,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await sendMessage(content, imageUrl);
      
      if (response.chat_id) {
        setCurrentChatId(response.chat_id);
        // Set SEBELUM navigate agar useEffect([urlSessionId]) tidak re-trigger loadSession
        // dan overwrite messages yang sudah kita append secara lokal
        loadedSessionIdRef.current = response.chat_id;
        if (!urlSessionId || urlSessionId !== response.chat_id) {
          navigate(`/chat/${response.chat_id}`, { replace: true });
        }
      }

      if (response && response.message && response.message.trim() !== '') {
        const botMsgId = response.id || `bot-${Date.now()}`;
        const botMsg: ChatMessage = {
          id: botMsgId, role: 'bot', content: response.message, timestamp: new Date(),
          createdAt: response.created_at || new Date().toISOString(),
        };

        setMessages(prev => {
          // Dedupe: jangan append kalau id sudah ada (guard dari polling race)
          if (prev.some(m => m.id === botMsgId)) return prev;
          const updated = [...prev.filter(m => m.id !== `user-temp`), botMsg];
          checkAndShowSummaryPrompt(updated);
          return updated;
        });
        pendingResolvedMsgId.current = botMsgId;
      }

    } catch {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`, role: 'bot',
        content: 'Maaf, sistem sedang sibuk. Pastikan koneksi internet Anda stabil.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResolvedAction = async (solved: boolean) => {
    // Ambil chatId dari semua sumber yang mungkin — ref, context, session, atau URL param
    const chatId = currentChatIdRef.current || currentChatId || currentSession?.id || urlSessionId;
    setResolvedState(solved ? 'solved' : 'unsolved');
    if (!solved) {
      setShowEscalationText(true);
      try {
        if (chatId && chatId !== 'new') {
          console.log('[Escalate] Escalating chatId:', chatId);
          await escalateToCS(chatId);
          // Update status lokal ke waiting_cs agar polling CS aktif & UI berubah
          setCurrentSession((prev: any) => prev ? { ...prev, status: 'waiting_cs' } : prev);
        } else {
          console.warn('[Escalate] Tidak ada chatId valid, escalation dibatalkan');
        }
      } catch (err) {
        console.error('Escalate error:', err);
      }
    } else {
      setCurrentSession((prev: any) => prev ? { ...prev, status: 'solved' } : prev);
    }
  };

  const handleNewChat = () => {
    setSummaryAccepted(false);
    setShowSummaryPrompt(false);
    summaryShownRef.current = false;
    csSummaryShownRef.current = false;
    setResolvedActionMsgId(null);
    setResolvedState('none');
    setShowEscalationText(false);
    pendingResolvedMsgId.current = null;
    loadedSessionIdRef.current = null;
    setCurrentSession(null);
    setCurrentChatId(null);
    setMessages([]);
    navigate('/chat', { replace: true });
  };

  const csHandlerName = currentSession?.csHandlerName || currentSession?.cs_name || null;
  const headerTitle = isCSMode && csHandlerName
    ? `EPSON Support | ${csHandlerName}`
    : isSolved
    ? 'EPSON Support | Diskusi Selesai'
    : 'EPSON AI Assistant';

  const acceptSummary = (accept: boolean) => {
    if (accept) {
      setSummaryAccepted(true);
    } else {
      setShowSummaryPrompt(false);
      summaryShownRef.current = true;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-gray-50">
      <SidebarNav bottomContent={<FAQPanel onSelectQuestion={handleSend} />} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 h-full bg-gray-50">

        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-3 shrink-0 min-w-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0"
              style={{ backgroundColor: isSolved ? '#4b5563' : 'var(--epson-blue-mid)' }}
            >
              {isCSMode
                ? <Headphones size={20} className="text-white" />
                : <BotMessageSquare size={20} className="text-white" />
              }
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-[15px] truncate">{headerTitle}</p>
              <p className={`text-xs flex items-center gap-1 ${isSolved ? 'text-gray-500' : 'text-green-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${isSolved ? 'bg-gray-400' : 'bg-green-500 animate-pulse'}`} />
                {isSolved 
                  ? 'Sesi ditutup permanen'
                  : isCSMode 
                    ? (csHandlerName ? `Dilayani oleh ${csHandlerName}` : 'Menghubungkan ke CS...') 
                    : 'Online - Siap membantu'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-gray-400 hidden sm:block">{today}</span>
            <button
              onClick={handleNewChat}
              className="w-9 h-9 flex items-center justify-center text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
              aria-label="Chat baru"
            >
              <PlusCircle size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 flex flex-col gap-1 custom-scrollbar min-w-0">
          {messages.length === 0 && !isTyping && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
                <BotMessageSquare size={28} className="text-white" />
              </div>
              <p className="text-gray-700 font-semibold mb-1">Halo! Ada yang bisa saya bantu?</p>
              <p className="text-gray-400 text-sm">Tanyakan seputar produk Epson Anda</p>
            </div>
          )}

          {messages.map((msg) =>
            msg.isSummary ? (
              <SummaryBubble
                key={msg.id}
                content={msg.summaryContent!}
                messages={currentSession?.messages ?? []}
                sessionTitle={currentSession?.title ?? 'Percakapan'}
                isCSHandover={msg.isCSHandover}
              />
            ) : (
              <MessageBubble
                key={msg.id}
                message={msg}
                showResolvedActions={msg.id === resolvedActionMsgId && !isCSMode && !isSolved && !isTyping}
                resolvedState={msg.id === resolvedActionMsgId ? resolvedState : 'none'}
                onMarkSolved={handleResolvedAction}
                csHandlerName={csHandlerName}
              />
            )
          )}

          {isTyping && <TypingIndicator />}

          {showEscalationText && (
            <div className="flex items-center gap-3 py-4 animate-in fade-in">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-xs text-gray-500 text-center whitespace-normal max-w-sm">
                Percakapan anda sedang diteruskan ke Customer Service kami, mohon tunggu untuk beberapa saat...
              </span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
          )}

          {showSummaryPrompt && !isTyping && !isCSMode && !isSolved && (
            <div className="flex flex-col items-center gap-3 py-6 animate-in fade-in slide-in-from-bottom-2 w-full px-2">
              <div className="h-[1px] w-full bg-gray-200" />
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-blue-50 border border-blue-100 p-5 rounded-2xl w-full max-w-lg shadow-sm">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs font-bold text-blue-900 mb-1">Butuh Ringkasan?</p>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Percakapan mulai panjang. Ingin saya merangkum solusi teknis di atas agar lebih mudah dibaca?
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-center">
                  <button onClick={() => acceptSummary(true)} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-4 py-2.5 rounded-lg shadow-md transition-all whitespace-nowrap">
                    YA, RINGKAS
                  </button>
                  <button onClick={() => acceptSummary(false)} className="flex-1 sm:flex-none bg-white border border-blue-200 text-blue-600 text-[10px] font-bold px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-all whitespace-nowrap">
                    NANTI
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} className="h-4 shrink-0" />
        </div>

        <div className="bg-white border-t border-gray-100 shrink-0 min-w-0 w-full">
          {isCSMode && !isSolved && (
            <div className="px-6 pt-3">
              <p className="text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2 text-center">
                💬 Terhubung dengan {csHandlerName || 'Customer Service'} — ketik pesan untuk membalas
              </p>
            </div>
          )}

          {isSolved && (
            <div className="px-6 pt-3">
              <p className="text-xs text-gray-600 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 text-center font-medium">
                🔒 Sesi diskusi ini telah selesai dan ditutup. Silakan klik ikon (+) di kanan atas untuk membuat "Chat Baru".
              </p>
            </div>
          )}

          <ChatInput 
            onSend={handleSend} 
            disabled={isTyping || isSolved || currentSession?.status === 'waiting_cs'} 
            quickReplies={isCSMode || isSolved ? [] : QUICK_REPLIES} 
          />
        </div>
      </div>
    </div>
  );
}