// frontend/src/components/cs/CSDashboard.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Headphones, ArrowLeft, Send, CheckCircle, XCircle, Clock, BotMessageSquare, User, Lock, Loader2, Search, Image, X } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatSession, ChatMessage } from '@/types';
import { cn } from '@/utils/cn';
import { getCSChatDetail, generateCSSummary } from '@/services/api';

type FilterStatus = 'all' | 'waiting' | 'handled' | 'solved' | 'unsolved';

export default function CSDashboard() {
  const { sessions, csClaimSession, csReplyToSession, csMarkSession, loadCSEscalatedSessions } = useChat();
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const listPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadCSEscalatedSessions(); }, []);

  useEffect(() => {
    if (selectedSession) {
      if (listPollingRef.current) { clearInterval(listPollingRef.current); listPollingRef.current = null; }
      return;
    }
    listPollingRef.current = setInterval(() => loadCSEscalatedSessions(), 5000);
    return () => { if (listPollingRef.current) clearInterval(listPollingRef.current); };
  }, [selectedSession]);

  useEffect(() => {
    if (!selectedSession) {
      if (msgPollingRef.current) { clearInterval(msgPollingRef.current); msgPollingRef.current = null; }
      return;
    }
    const sessionId = selectedSession.id;
    const pollMessages = async () => {
      try {
        const data = await getCSChatDetail(sessionId);
        const fetched: ChatMessage[] = (data.messages || []).map((msg: any) => ({
          id: msg.id,
          role: msg.role === 'assistant' ? 'bot' : msg.role,
          content: msg.content,
          imageUrl: msg.image_url || msg.imageUrl,
          image_url: msg.image_url || msg.imageUrl,
          createdAt: msg.created_at || msg.createdAt,
          timestamp: new Date(msg.created_at || msg.createdAt),
        }));
        setLiveMessages(prev => fetched.length === prev.length ? prev : fetched);
      } catch { /* silent */ }
    };
    pollMessages();
    msgPollingRef.current = setInterval(pollMessages, 3000);
    return () => { if (msgPollingRef.current) clearInterval(msgPollingRef.current); };
  }, [selectedSession?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [liveMessages, summary]);

  // ✅ Kunci 1: Casting ke string agar bebas dari ancaman type overlap saat kompilasi
  const escalatedSessions = useMemo(() => {
    return sessions.filter(s => {
      const statusStr = s.status as string;
      
      // Jika statusnya solved/resolved, langsung loloskan ke view history tanpa validasi cs_id
      if (['solved', 'resolved', 'unsolved'].includes(statusStr)) {
        return true;
      }
      
      // Untuk status berjalan, biarkan sesuai aturan lama
      return ['waiting_cs', 'with_cs'].includes(statusStr);
    });
  }, [sessions]);

  // ✅ Kunci 2: Sinkronisasi filter pencarian sub-menu tab
  const filteredSessions = useMemo(() => {
    let list = [...escalatedSessions];
    const currentStatus = filterStatus as string;
    
    if (currentStatus === 'waiting') {
      list = list.filter(s => s.status === 'waiting_cs');
    } else if (currentStatus === 'handled') {
      list = list.filter(s => s.status === 'with_cs');
    } else if (currentStatus === 'solved') {
      list = list.filter(s => s.status === 'solved' || (s.status as string) === 'resolved');
    } else if (currentStatus === 'unsolved') {
      list = list.filter(s => s.status === 'unsolved');
    }
    
    if (filterYear) list = list.filter(s => new Date(s.createdAt || '').getFullYear() === Number(filterYear));
    if (filterMonth) list = list.filter(s => new Date(s.createdAt || '').getMonth() + 1 === Number(filterMonth));
    if (filterDate) list = list.filter(s => new Date(s.createdAt || '').getDate() === Number(filterDate));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.preview || '').toLowerCase().includes(q) ||
        (s.userName || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    return list;
  }, [escalatedSessions, filterStatus, filterDate, filterMonth, filterYear, searchQuery]);

  const availableYears = useMemo(() => {
    const years = [...new Set(escalatedSessions.map(s => new Date(s.createdAt || '').getFullYear()))];
    return years.sort((a, b) => b - a);
  }, [escalatedSessions]);

  const liveSelected = selectedSession ? sessions.find(s => s.id === selectedSession.id) ?? selectedSession : null;

  const handleClaim = async (session: ChatSession) => {
    if (!user) return;
    setClaiming(session.id);
    try {
      await csClaimSession(session.id);
      setSelectedSession(session);
      setLiveMessages([]);
      setSummary(null);
    } catch { alert('Gagal mengambil sesi. Mungkin sudah diambil CS lain.'); }
    finally { setClaiming(null); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReplyImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleReply = async () => {
    if ((!replyText.trim() && !replyImage) || !liveSelected || !user) return;
    const text = replyText.trim();
    const imgUrl = replyImage;
    
    setReplyText('');
    setReplyImage(null);
    
    try {
      const finalContent = imgUrl ? `${text}\n[IMAGE_DATA_URL:${imgUrl}]`.trim() : text;
      await csReplyToSession(liveSelected.id, finalContent || '📷 Gambar');
      
      const data = await getCSChatDetail(liveSelected.id);
      const fetched: ChatMessage[] = (data.messages || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role === 'assistant' ? 'bot' : msg.role,
        content: msg.content,
        imageUrl: msg.image_url || msg.imageUrl,
        image_url: msg.image_url || msg.imageUrl,
        createdAt: msg.created_at || msg.createdAt,
        timestamp: new Date(msg.created_at || msg.createdAt),
      }));
      setLiveMessages(fetched);
    } catch (err) { console.error('Reply error:', err); }
  };

  // ✅ SESUDAH — unsolved tetap tampil di detail view dengan status updated
  const handleMark = async (solved: boolean) => {
    if (!liveSelected) return;
    try {
      await csMarkSession(liveSelected.id, solved ? 'solved' : 'unsolved');
      // Refresh list di background agar badge count terupdate
      loadCSEscalatedSessions();

      if (solved) {
        // Solved: tampilkan ringkasan AI lalu CS bisa kembali
        setLoadingSummary(true);
        setSummary(null);
        try {
          const result = await generateCSSummary(liveSelected.id);
          setSummary(result.summary || null);
        } catch { setSummary(null); }
        finally { setLoadingSummary(false); }
      }
    } catch (err) { console.error('Mark error:', err); }
  };

  const handleBack = () => {
    setSelectedSession(null);
    setLiveMessages([]);
    setSummary(null);
    loadCSEscalatedSessions();
  };

  const formatTime = (d?: Date | string) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
  const formatDate = (d?: Date | string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const formatDateTime = (d?: Date | string) => d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const isMySession = liveSelected?.assignedToCSId === user?.id;
  const isTakenByOther = !!(liveSelected?.assignedToCSId && liveSelected.assignedToCSId !== user?.id);
  const canReply = liveSelected?.status === 'with_cs' && (isMySession || !liveSelected?.assignedToCSId);
  const sessionStatusStr = liveSelected?.status as string;
  const isClosed = sessionStatusStr === 'solved' || sessionStatusStr === 'resolved' || sessionStatusStr === 'unsolved';
  const csDisplayName = user?.full_name || user?.name || 'Customer Service';

  // ─── Detail View ───────────────────────────────────────────
  if (liveSelected) {
    if (isClosed && (summary || loadingSummary) && (liveSelected.status === 'solved' || (liveSelected.status as string) === 'resolved')) {
      return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-3 shrink-0">
            <button onClick={handleBack} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500">
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="font-bold text-gray-800 text-sm">Ringkasan Penanganan</p>
              <p className="text-xs text-gray-400">{liveSelected.title}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 text-lg mb-1">Chat Selesai</p>
              <p className="text-gray-400 text-sm">Sesi telah ditutup</p>
            </div>

            <div className="w-full max-w-lg bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">CS</span>
                  <span className="text-gray-800 font-semibold">{csDisplayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Customer</span>
                  <span className="text-gray-800">{liveSelected.userName || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Waktu</span>
                  <span className="text-gray-800">{formatDateTime(liveSelected.updatedAt || liveSelected.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <p className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
                <BotMessageSquare size={16} style={{ color: 'var(--epson-blue)' }} />
                Ringkasan AI
              </p>
              {loadingSummary ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 size={16} className="animate-spin" /> Membuat ringkasan...
                </div>
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
              )}
            </div>

            <button onClick={handleBack}
              className="text-white font-semibold px-8 py-3 rounded-xl transition-all"
              style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500">
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="font-bold text-gray-800 text-sm">{liveSelected.title}</p>
              <p className="text-xs text-gray-400">
                {liveMessages.length} pesan · {formatDate(liveSelected.createdAt)}
                {liveSelected.userName && <span className="ml-1">· {liveSelected.userName}</span>}
              </p>
            </div>
          </div>
          {liveSelected.status === 'with_cs' && isMySession && (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => handleMark(true)} className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all">
                <CheckCircle size={14} /> Tandai Selesai
              </button>
              <button onClick={() => handleMark(false)} className="flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold px-3 py-2 rounded-xl transition-all">
                <XCircle size={14} /> Tidak Selesai
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 custom-scrollbar">
          {liveMessages.length === 0 && (
            <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Memuat percakapan...</span>
            </div>
          )}

          {liveMessages.map((msg: ChatMessage) => {
            const hasImg = msg.imageUrl || msg.image_url;
            if (msg.role === 'cs') return (
              <div key={msg.id} className="flex justify-end">
                <div className="flex flex-col items-end max-w-[70%] gap-1">
                  <p className="text-[10px] font-semibold px-1" style={{ color: 'var(--epson-blue-mid)' }}>
                    {liveSelected.csHandlerName ?? csDisplayName}
                  </p>
                  <div className="text-white px-4 py-3 rounded-[18px] rounded-tr-[4px] text-sm leading-relaxed"
                    style={{ background: 'linear-gradient(to bottom right, var(--epson-blue-light), var(--epson-blue-mid))' }}>
                    {hasImg && <img src={hasImg} alt="attachment" className="rounded-lg mb-2 max-w-xs cursor-pointer shadow-sm hover:opacity-90" onClick={() => window.open(hasImg, '_blank')} />}
                    {msg.content && msg.content !== '📷 Gambar' && <p className="whitespace-pre-wrap">{msg.content}</p>}
                  </div>
                  <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp || msg.createdAt)}</span>
                </div>
              </div>
            );
            if (msg.role === 'user') return (
              <div key={msg.id} className="flex gap-2 items-end max-w-[70%]">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <User size={15} className="text-gray-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold px-1 text-gray-500">{liveSelected.userName ?? 'User'}</p>
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-[18px] rounded-tl-[4px] text-sm text-gray-800 leading-relaxed">
                    {hasImg && <img src={hasImg} alt="attachment" className="rounded-lg mb-2 max-w-xs cursor-pointer shadow-sm hover:opacity-90" onClick={() => window.open(hasImg, '_blank')} />}
                    {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">{formatTime(msg.timestamp || msg.createdAt)}</span>
                </div>
              </div>
            );
            return (
              <div key={msg.id} className="flex gap-2 items-end max-w-[70%]">
                <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--epson-blue-card)', borderColor: 'var(--epson-blue-light)' }}>
                  <BotMessageSquare size={15} style={{ color: 'var(--epson-blue)' }} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold px-1 text-gray-400">Bot</p>
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-[18px] rounded-tl-[4px] text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">{formatTime(msg.timestamp || msg.createdAt)}</span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {canReply ? (
          <div className="bg-white border-t border-gray-100 p-4 flex flex-col gap-2">
            {replyImage && (
              <div className="relative inline-flex">
                <img src={replyImage} alt="preview" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                <button onClick={() => setReplyImage(null)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md">
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <button onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-200 transition-all shrink-0">
                <Image size={17} />
              </button>
              <input
                type="text" value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
                placeholder={`Balas sebagai ${csDisplayName}...`}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button onClick={handleReply} disabled={!replyText.trim() && !replyImage}
                className="w-10 h-10 flex items-center justify-center disabled:opacity-40 text-white rounded-xl transition-all shadow-sm"
                style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
                <Send size={17} />
              </button>
            </div>
          </div>
        ) : isTakenByOther ? (
          <div className="bg-yellow-50 border-t border-yellow-100 px-6 py-3 text-center">
            <p className="text-xs text-yellow-700 flex items-center justify-center gap-2">
              <Lock size={12} /> Sesi ini sedang ditangani oleh <strong>{liveSelected.csHandlerName}</strong>
            </p>
          </div>
        ) : liveSelected.status === 'waiting_cs' ? (
          <div className="bg-blue-50 border-t border-blue-100 px-6 py-4 flex flex-col items-center gap-2">
            <p className="text-xs text-blue-600">Ambil sesi ini untuk mulai membalas</p>
            <button onClick={() => handleClaim(liveSelected)} disabled={claiming === liveSelected.id}
              className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all disabled:opacity-60 shadow-sm"
              style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
              {claiming === liveSelected.id ? <><Loader2 size={14} className="animate-spin" /> Mengambil...</> : 'Ambil Sesi Ini'}
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 text-center">
            <p className="text-xs text-gray-400">
              {['solved', 'resolved'].includes(liveSelected.status as string) ? '✅ Sesi ini telah ditandai selesai.' : '❌ Sesi ini ditandai tidak terselesaikan.'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ─── List View ─────────────────────────────────────────────
  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'handled', label: 'Ditangani' },
    { key: 'waiting', label: 'Menunggu' },
    { key: 'solved', label: 'Selesai' },
    { key: 'unsolved', label: 'Tidak Selesai' },
  ];
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  const hasDateFilter = filterDate || filterMonth || filterYear;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="pl-12 sm:pl-0 mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Headphones size={22} style={{ color: 'var(--epson-blue)' }} /> CS Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Sesi pengguna yang menunggu bantuan Customer Service</p>
      </div>

      <div className="relative max-w-2xl mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari nama customer, judul, atau preview..."
          className="w-full bg-white border border-gray-200 rounded-2xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all" />
      </div>

      <div className="flex gap-1.5 flex-wrap mb-3 max-w-2xl">
        {FILTERS.map(f => {
          const count = f.key === 'all' ? escalatedSessions.length
            : f.key === 'waiting' ? escalatedSessions.filter(s => s.status === 'waiting_cs').length
            : f.key === 'handled' ? escalatedSessions.filter(s => s.status === 'with_cs').length
            : f.key === 'solved' ? escalatedSessions.filter(s => s.status === 'solved' || (s.status as string) === 'resolved').length
            : escalatedSessions.filter(s => s.status === 'unsolved').length;
          return (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              className={cn('text-xs font-semibold px-3 py-1.5 rounded-full border transition-all',
                filterStatus === f.key ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}
              style={filterStatus === f.key ? { backgroundColor: 'var(--epson-blue-mid)' } : {}}>
              {f.label}
              <span className={cn('ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]',
                filterStatus === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-5 max-w-2xl">
        <select value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white text-gray-600 outline-none focus:border-blue-300 cursor-pointer">
          <option value="">Tgl</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white text-gray-600 outline-none focus:border-blue-300 cursor-pointer">
          <option value="">Bulan</option>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white text-gray-600 outline-none focus:border-blue-300 cursor-pointer">
          <option value="">Tahun</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {hasDateFilter && (
          <button onClick={() => { setFilterDate(''); setFilterMonth(''); setFilterYear(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline">Reset</button>
        )}
      </div>

      {escalatedSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Headphones size={40} className="mb-3 opacity-40" />
          <p className="text-sm">Belum ada sesi yang diteruskan ke CS</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Clock size={36} className="mb-3 opacity-40" />
          <p className="text-sm">Tidak ada sesi yang cocok</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-2xl">
          {filteredSessions.map(session => {
            const isMine = session.assignedToCSId === user?.id;
            const isTaken = !!(session.assignedToCSId && session.assignedToCSId !== user?.id);
            const preview = session.preview ? session.preview.substring(0, 60) + (session.preview.length > 60 ? '...' : '') : 'Tidak ada preview';
            const isClaiming = claiming === session.id;
            const isSessionSolved = session.status === 'solved' || (session.status as string) === 'resolved';

            return (
              <div key={session.id} className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 flex-1">{session.title}</p>
                  <span className={cn('flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0',
                    session.status === 'waiting_cs' ? 'bg-blue-100 text-blue-600'
                    : session.status === 'with_cs' ? 'bg-orange-100 text-orange-600'
                    : isSessionSolved ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'
                  )}>
                    {session.status === 'waiting_cs' ? <><Clock size={10} /> Menunggu</>
                    : session.status === 'with_cs' ? <><Clock size={10} /> Ditangani</>
                    : isSessionSolved ? <><CheckCircle size={10} /> Selesai</>
                    : <><XCircle size={10} /> Tidak Selesai</>}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mb-1">{formatDate(session.createdAt)}</p>
                <p className="text-xs text-gray-500 truncate mb-2">"{preview}"</p>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] min-w-0">
                    {isTaken && <p className="text-yellow-600 flex items-center gap-1 truncate"><Lock size={10} /> Ditangani oleh {session.csHandlerName || 'CS lain'}</p>}
                    {isMine && <p className="text-green-600 flex items-center gap-1"><CheckCircle size={10} /> Ditangani oleh Anda</p>}
                  </div>

                  {(session.status === 'waiting_cs' || session.status === 'with_cs') ? (
                    <button onClick={() => handleClaim(session)} disabled={isClaiming}
                      className={cn('text-xs font-semibold px-4 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5',
                        isClaiming ? 'opacity-60 cursor-not-allowed' : '',
                        isTaken ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'text-white hover:opacity-90'
                      )}
                      style={!isTaken ? { backgroundColor: 'var(--epson-blue-mid)' } : {}}>
                      {isClaiming ? <><Loader2 size={12} className="animate-spin" /> Memuat...</>
                        : isMine ? 'Lanjutkan' : isTaken ? 'Lihat' : 'Ambil'}
                    </button>
                  ) : (
                    <button onClick={() => { setSelectedSession(session); setLiveMessages([]); setSummary(null); }}
                      className="text-xs font-semibold px-4 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all shrink-0">
                      Lihat
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}