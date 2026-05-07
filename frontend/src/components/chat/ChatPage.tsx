import React, { useEffect, useRef, useState } from 'react';
import { BotMessageSquare, PlusCircle } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { SidebarNav } from '@/components/layout/AppLayout';
import MessageBubble from '@/components/chat/MessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ChatInput from '@/components/chat/ChatInput';
import PostAnswerActions from '@/components/chat/PostAnswerActions';
import SummaryBubble from '@/components/chat/SummaryBubble';
import FAQPanel from '@/components/chat/FAQPanel';
import { ChatMessage } from '@/types';
import { sendMessageToAI, getAISummary } from '@/services/api';

const QUICK_REPLIES = ['Printer tidak dapat mencetak', 'Cara install driver', 'Cara mengisi tinta'];

interface ExtendedMessage extends ChatMessage {
  isSummary?: boolean;
  summaryContent?: string;
}

interface ChatPageProps {
  onNavigate: (path: string) => void;
}

export default function ChatPage({ onNavigate }: ChatPageProps) {
  const {
    currentSession,
    startNewSession,
    addMessageToSession,
    markSessionSolved,
    isTyping,
    setIsTyping,
    showSummaryPrompt,
    summaryAccepted,
    acceptSummary,
    resetSummaryFlow,
  } = useChat();

  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [showResolvedPrompt, setShowResolvedPrompt] = useState(false);

  // 1. Inisialisasi sesi jika kosong
  useEffect(() => {
    if (!currentSession) startNewSession();
  }, []);

  // 2. Sinkronisasi pesan dari Context ke State Lokal
  useEffect(() => {
    if (!currentSession) return;
    setMessages(currentSession.messages.map((m: ChatMessage) => ({ ...m })));
  }, [currentSession]);

  // 3. Auto-scroll ke bawah secara otomatis dengan sedikit delay
  useEffect(() => {
    const timeout = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timeout);
  }, [messages, isTyping, showSummaryPrompt, showResolvedPrompt]);

  // 4. LOGIKA EKSEKUSI RINGKASAN (SUMMARY)
  useEffect(() => {
    const handleGenerateSummary = async () => {
      // Jalankan hanya jika user menekan "YA, RINGKAS"
      if (summaryAccepted === true && currentSession) {
        setIsTyping(true); // Tampilkan loading titik-titik
        
        try {
          // A. Bersihkan history (Hapus base64 gambar agar API backend tidak error/timeout)
          const chatHistory = currentSession.messages
            .filter(m => m.id !== 'welcome' && !m.id.startsWith('err-'))
            .map(m => ({
              role: m.role === 'bot' ? 'assistant' : 'user',
              content: typeof m.content === 'string' ? m.content : "User mengirimkan gambar"
            }));

          // B. Panggil API Summary ke Backend
          const response = await getAISummary(chatHistory);

          // C. Buat pesan khusus tipe Summary
          const summaryMsg: ExtendedMessage = {
            id: `summary-${Date.now()}`,
            role: 'bot',
            content: response.message,
            timestamp: new Date(),
            isSummary: true, // Flag agar dirender menggunakan SummaryBubble
            summaryContent: response.message,
          };

          // D. Masukkan Ringkasan ke dalam Chat melalui Context
          addMessageToSession(summaryMsg);
          
          // E. Tampilkan pilihan Terselesaikan/Belum HANYA setelah summary sukses
          setShowResolvedPrompt(true); 
          
        } catch (error) {
          console.error("Gagal membuat summary:", error);
        } finally {
          setIsTyping(false);
          // F. RESET state agar prompt biru menghilang dan tidak looping
          acceptSummary(null as any); 
        }
      }
    };

    handleGenerateSummary();
  }, [summaryAccepted, currentSession?.id]);

  /**
   * FUNGSI UTAMA PENGIRIMAN PESAN
   */
  const handleSend = async (content: string, imageUrl?: string) => {
    // Sembunyikan prompt summary jika user memilih lanjut bertanya manual
    if (showSummaryPrompt) {
      acceptSummary(false);
    }
    
    // Sembunyikan prompt kepuasan jika user mulai chat baru lagi
    setShowResolvedPrompt(false);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      imageUrl
    };
    
    addMessageToSession(userMsg);
    setIsTyping(true); 

    try {
      const chatHistory = currentSession?.messages.map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content
      })) || [];

      const response = await sendMessageToAI(content, imageUrl, chatHistory);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: response.message,
        timestamp: new Date(),
      };
      
      addMessageToSession(botMsg);

    } catch (error: any) {
      addMessageToSession({
        id: `err-${Date.now()}`,
        role: 'bot',
        content: `Maaf, sistem sedang sibuk. Pastikan koneksi internet Anda stabil.`,
        timestamp: new Date(),
      });
    } finally {
      setIsTyping(false); 
    }
  };

  /**
   * ACTION FEEDBACK: Terselesaikan / Belum
   */
  const onSolveAction = (solved: boolean) => {
    markSessionSolved(currentSession!.id, solved);
    setShowResolvedPrompt(false); // Hilangkan prompt pilihan setelah diklik
  };

  const handleNewChat = () => {
    resetSummaryFlow();
    setShowResolvedPrompt(false);
    startNewSession();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav bottomContent={<FAQPanel onSelectQuestion={handleSend} />} />

      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <BotMessageSquare size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-800">EPSON AI Assistant</p>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
              Online
            </p>
          </div>
          <div className="ml-auto">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all"
            >
              <PlusCircle size={16} />
              Chat Baru
            </button>
          </div>
        </header>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 custom-scrollbar">
          {messages.map((msg) =>
            msg.isSummary ? (
              <SummaryBubble
                key={msg.id}
                content={msg.summaryContent!}
                messages={currentSession?.messages ?? []}
                sessionTitle={currentSession?.title ?? 'Percakapan'}
              />
            ) : (
              <MessageBubble key={msg.id} message={msg} />
            )
          )}

          {isTyping && <TypingIndicator />}

          {/* 1. UI PROMPT SUMMARY INLINE (Box Biru) */}
          {showSummaryPrompt && !isTyping && (
            <div className="flex flex-col items-center gap-3 py-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="h-[1px] w-full bg-gray-200" />
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-blue-50 border border-blue-100 p-5 rounded-2xl w-full max-w-lg shadow-sm">
                <div className="flex-1">
                  <p className="text-xs font-bold text-blue-900 mb-1">Butuh Ringkasan?</p>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Percakapan mulai panjang. Ingin saya merangkum solusi teknis di atas agar lebih mudah dibaca?
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => acceptSummary(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-4 py-2.5 rounded-lg shadow-md transition-all"
                  >
                    YA, RINGKAS
                  </button>
                  <button
                    onClick={() => acceptSummary(false)}
                    className="bg-white border border-blue-200 text-blue-600 text-[10px] font-bold px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-all"
                  >
                    NANTI
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. PROMPT STATUS (Muncul HANYA setelah Summary dibuat) */}
          {showResolvedPrompt && !isTyping && (
            <div className="animate-in fade-in slide-in-from-bottom-2 py-4 border-t border-gray-100">
              <PostAnswerActions onMarkSolved={onSolveAction} />
            </div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>

        {/* Input Bar */}
        <div className="bg-white border-t border-gray-100 p-4">
          <ChatInput onSend={handleSend} disabled={isTyping} quickReplies={QUICK_REPLIES} />
        </div>
      </div>
    </div>
  );
}