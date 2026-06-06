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
import { getAISummary } from '@/services/api';

const QUICK_REPLIES = ['Printer tidak dapat mencetak', 'Cara install driver', 'Cara mengisi tinta'];

interface ExtendedMessage extends ChatMessage {
  isSummary?: boolean;
  summaryContent?: string;
}

type ResolvedState = 'none' | 'solved' | 'unsolved';

interface ChatPageProps {
  onNavigate: (path: string) => void;
}

export default function ChatPage({ onNavigate }: ChatPageProps) {
  const {
    sessions, currentSessionId, currentChatId,
    sendMessage, loadSession, loadUserSessions, escalateToCS,
    isLoading, error,
  } = useChat();

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

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  useEffect(() => {
    loadUserSessions().then(() => {
      if (sessions.length === 0) {
        setCurrentSession({ id: 'new', title: 'New Chat', messages: [] });
      } else {
        const latest = sessions[sessions.length - 1];
        setCurrentSession(latest);
        loadSession(latest.id);
      }
    });
  }, []);

  useEffect(() => {
    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
      setCurrentSession(session);
      setMessages(session.messages?.map((m: ChatMessage) => ({ ...m })) || []);
      if (session.messages?.length >= 8) {
        setShowSummaryPrompt(true);
      }
    }
  }, [sessions, currentSessionId]);

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

  useEffect(() => {
    const run = async () => {
      if (summaryAccepted !== true || !currentSession) return;
      setIsTyping(true);
      try {
        const chatHistory = currentSession.messages
          .filter((m: any) => m.id !== 'welcome' && !m.id.startsWith('err-'))
          .map((m: any) => ({
            role: m.role === 'bot' ? 'assistant' : 'user',
            content: typeof m.content === 'string' ? m.content : 'User mengirimkan gambar',
          }));
        const response = await getAISummary(chatHistory);
        const newMsg = {
          id: `summary-${Date.now()}`,
          role: 'bot',
          content: response.message,
          timestamp: new Date(),
          isSummary: true,
          summaryContent: response.message,
        };
        setMessages(prev => [...prev, newMsg as ExtendedMessage]);
      } catch (err) {
        console.error('Gagal membuat summary:', err);
      } finally {
        setIsTyping(false);
        setSummaryAccepted(false);
      }
    };
    run();
  }, [summaryAccepted, currentSession?.id]);

  const handleSend = async (content: string, imageUrl?: string) => {
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
      const chatHistory = (currentSession?.messages || [])
        .filter((m: any) => m.id !== 'welcome')
        .map((m: any) => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: typeof m.content === 'string' ? m.content : 'User mengirimkan gambar',
        }));
      const response = await sendMessage(content, imageUrl);
      const botMsgId = `bot-${Date.now()}`;
      const botMsg: ChatMessage = {
        id: botMsgId, role: 'bot', content: response.message, timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      pendingResolvedMsgId.current = botMsgId;
      if (currentSession?.messages?.length >= 6) {
        setShowSummaryPrompt(true);
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
    if (!currentSession) return;
    setResolvedState(solved ? 'solved' : 'unsolved');
    if (solved) {
    } else {
      setShowEscalationText(true);
      try {
        await escalateToCS(currentSession.id);
      } catch (err) {
        console.error('Escalate error:', err);
      }
    }
  };

  const handleNewChat = () => {
    setSummaryAccepted(false);
    setShowSummaryPrompt(false);
    setResolvedActionMsgId(null);
    setResolvedState('none');
    setShowEscalationText(false);
    pendingResolvedMsgId.current = null;
    setCurrentSession({ id: 'new', title: 'New Chat', messages: [] });
    setMessages([]);
  };

  const isCSMode = currentSession?.csActive === true;
  const csHandlerName = currentSession?.csHandlerName ?? null;
  const headerTitle = isCSMode && csHandlerName
    ? `EPSON AI Assistant | ${csHandlerName}`
    : 'EPSON AI Assistant';

  const acceptSummary = (accept: boolean) => {
    setSummaryAccepted(accept);
    if (!accept) setShowSummaryPrompt(false);
  };

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-gray-50">
      <SidebarNav bottomContent={<FAQPanel onSelectQuestion={handleSend} />} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 h-full bg-gray-50">

        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-3 shrink-0 min-w-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0"
              style={{ backgroundColor: 'var(--epson-blue-mid)' }}
            >
              {isCSMode
                ? <Headphones size={20} className="text-white" />
                : <BotMessageSquare size={20} className="text-white" />
              }
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-[15px] truncate">{headerTitle}</p>
              <p className="text-xs flex items-center gap-1 text-green-500">
                <span className="w-1.5 h-1.5 rounded-full inline-block bg-green-500 shrink-0 animate-pulse" />
                Online - Siap membantu
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
          {messages.map((msg) =>
            msg.isSummary ? (
              <SummaryBubble
                key={msg.id}
                content={msg.summaryContent!}
                messages={currentSession?.messages ?? []}
                sessionTitle={currentSession?.title ?? 'Percakapan'}
              />
            ) : (
              <MessageBubble
                key={msg.id}
                message={msg}
                showResolvedActions={msg.id === resolvedActionMsgId && !isCSMode && !isTyping}
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

          {showSummaryPrompt && !isTyping && !isCSMode && (
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
          <ChatInput onSend={handleSend} disabled={isTyping} quickReplies={QUICK_REPLIES} />
        </div>
      </div>
    </div>
  );
}