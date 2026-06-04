import React, { useState, useMemo } from 'react';
import { Headphones, ArrowLeft, Send, CheckCircle, XCircle, Clock, BotMessageSquare, User, Lock } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatSession, ChatMessage } from '@/types';
import { cn } from '@/utils/cn';

type FilterStatus = 'all' | 'waiting' | 'solved' | 'unsolved';

export default function CSDashboard() {
  const { sessions, csClaimSession, csReplyToSession, csMarkSession } = useChat();
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const escalatedSessions = useMemo(
    () => sessions.filter(s => s.escalatedToCS),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    let list = [...escalatedSessions];
    if (filterStatus === 'waiting') list = list.filter(s => s.csActive);
    else if (filterStatus === 'solved') list = list.filter(s => !s.csActive && s.status === 'solved');
    else if (filterStatus === 'unsolved') list = list.filter(s => !s.csActive && s.status === 'unsolved');
    if (filterYear) list = list.filter(s => new Date(s.timestamp).getFullYear() === Number(filterYear));
    if (filterMonth) list = list.filter(s => new Date(s.timestamp).getMonth() + 1 === Number(filterMonth));
    if (filterDate) list = list.filter(s => new Date(s.timestamp).getDate() === Number(filterDate));
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  }, [escalatedSessions, filterStatus, filterDate, filterMonth, filterYear]);

  const availableYears = useMemo(() => {
    const years = [...new Set(escalatedSessions.map(s => new Date(s.timestamp).getFullYear()))];
    return years.sort((a, b) => b - a);
  }, [escalatedSessions]);

  // Sinkronisasi selectedSession dengan data terbaru
  const liveSelected = selectedSession
    ? sessions.find(s => s.id === selectedSession.id) ?? selectedSession
    : null;

  const handleClaim = (session: ChatSession) => {
    if (!user) return;
    const ok = csClaimSession(session.id, user.id, user.name);
    if (!ok) {
      alert('Sesi ini sudah diambil oleh CS lain.');
      return;
    }
    setSelectedSession(session);
  };

  const handleReply = () => {
    if (!replyText.trim() || !liveSelected || !user) return;
    csReplyToSession(liveSelected.id, replyText.trim(), user.name);
    setReplyText('');
  };

  const handleMark = (solved: boolean) => {
    if (!liveSelected) return;
    csMarkSession(liveSelected.id, solved);
    setSelectedSession(null);
  };

  const formatTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const isMySession = liveSelected?.assignedToCSId === user?.id;
  const isTakenByOther = liveSelected?.assignedToCSId && liveSelected.assignedToCSId !== user?.id;

  // ── Detail view ──
  if (liveSelected) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedSession(null)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="font-bold text-gray-800 text-sm">{liveSelected.title}</p>
              <p className="text-xs text-gray-400">{liveSelected.messages.length} pesan · {formatDate(liveSelected.timestamp)}</p>
            </div>
          </div>
          {liveSelected.csActive && isMySession && (
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
          {liveSelected.messages.map((msg: ChatMessage) => {
            // Perspektif CS: CS di kanan, user & bot di kiri
            if (msg.role === 'cs') return (
              <div key={msg.id} className="flex justify-end">
                <div className="flex flex-col items-end max-w-[70%] gap-1">
                  <p className="text-[10px] font-semibold px-1" style={{ color: 'var(--epson-blue-mid)' }}>
                    {liveSelected.csHandlerName ?? 'Customer Service'}
                  </p>
                  <div className="text-white px-4 py-3 rounded-[18px] rounded-tr-[4px] text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ background: 'linear-gradient(to bottom right, var(--epson-blue-light), var(--epson-blue-mid))' }}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            );
            if (msg.role === 'user') return (
              <div key={msg.id} className="flex gap-2 items-end max-w-[70%]">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <User size={15} className="text-gray-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold px-1 text-gray-500">
                    {liveSelected.userName ?? 'User'}
                  </p>
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-[18px] rounded-tl-[4px] text-sm text-gray-800 leading-relaxed">
                    {msg.imageUrl && <img src={msg.imageUrl} alt="attachment" className="rounded-lg mb-2 max-w-xs" />}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            );
            // Bot
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
                  <span className="text-[10px] text-gray-400 px-1">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input / Status */}
        {liveSelected.csActive ? (
          isMySession ? (
            <div className="bg-white border-t border-gray-100 p-4 flex gap-3">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
                placeholder={`Balas sebagai ${user?.name}...`}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button onClick={handleReply} disabled={!replyText.trim()}
                className="w-11 h-11 flex items-center justify-center disabled:opacity-40 text-white rounded-xl transition-all"
                style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
                <Send size={18} />
              </button>
            </div>
          ) : (
            <div className="bg-yellow-50 border-t border-yellow-100 px-6 py-3 text-center">
              <p className="text-xs text-yellow-700 flex items-center justify-center gap-2">
                <Lock size={12} /> Sesi ini sedang ditangani oleh <strong>{liveSelected.csHandlerName}</strong>
              </p>
            </div>
          )
        ) : (
          <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 text-center">
            <p className="text-xs text-gray-400">
              {liveSelected.status === 'solved' ? '✅ Sesi ini telah ditandai selesai.' : '❌ Sesi ini ditandai tidak terselesaikan.'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── List view ──
  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'waiting', label: 'Menunggu' },
    { key: 'solved', label: 'Selesai' },
    { key: 'unsolved', label: 'Tidak Selesai' },
  ];

  const MONTHS = [
    'Jan','Feb','Mar','Apr','Mei','Jun',
    'Jul','Ags','Sep','Okt','Nov','Des',
  ];

  const hasDateFilter = filterDate || filterMonth || filterYear;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="pl-12 sm:pl-0 mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Headphones size={22} style={{ color: 'var(--epson-blue)' }} /> CS Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Sesi pengguna yang menunggu bantuan Customer Service</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-3 max-w-2xl">
        {FILTERS.map(f => {
          const count = f.key === 'all' ? escalatedSessions.length
            : f.key === 'waiting' ? escalatedSessions.filter(s => s.csActive).length
            : f.key === 'solved' ? escalatedSessions.filter(s => !s.csActive && s.status === 'solved').length
            : escalatedSessions.filter(s => !s.csActive && s.status === 'unsolved').length;
          return (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-full border transition-all',
                filterStatus === f.key
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}
              style={filterStatus === f.key ? { backgroundColor: 'var(--epson-blue-mid)', borderColor: 'var(--epson-blue-mid)' } : {}}
            >
              {f.label}
              <span className={cn('ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]',
                filterStatus === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Date filter row */}
      <div className="flex items-center gap-2 flex-wrap mb-5 max-w-2xl">
        {/* Tanggal */}
        <select
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white text-gray-600 outline-none focus:border-blue-300 cursor-pointer"
        >
          <option value="">Tgl</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Bulan */}
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white text-gray-600 outline-none focus:border-blue-300 cursor-pointer"
        >
          <option value="">Bulan</option>
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>

        {/* Tahun */}
        <select
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white text-gray-600 outline-none focus:border-blue-300 cursor-pointer"
        >
          <option value="">Tahun</option>
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Reset button */}
        {hasDateFilter && (
          <button
            onClick={() => { setFilterDate(''); setFilterMonth(''); setFilterYear(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
          >
            Reset
          </button>
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
          <p className="text-sm">Tidak ada sesi yang cocok dengan filter ini</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-2xl">
          {filteredSessions.map(session => {
            const isMine = session.assignedToCSId === user?.id;
            const isTaken = session.assignedToCSId && session.assignedToCSId !== user?.id;
            return (
              <div key={session.id} className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
                {/* Top row: title + status badge */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 flex-1">{session.title}</p>
                  <span className={cn(
                    'flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0',
                    session.csActive ? 'bg-orange-100 text-orange-600'
                    : session.status === 'solved' ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'
                  )}>
                    {session.csActive ? <><Clock size={10} /> Menunggu</>
                    : session.status === 'solved' ? <><CheckCircle size={10} /> Selesai</>
                    : <><XCircle size={10} /> Tidak Selesai</>}
                  </span>
                </div>

                {/* Date + preview */}
                <p className="text-[11px] text-gray-400 mb-1">{formatDate(session.timestamp)}</p>
                <p className="text-xs text-gray-500 truncate mb-2">"{session.preview}"</p>

                {/* Handler info + action button */}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] min-w-0">
                    {isTaken && (
                      <p className="text-yellow-600 flex items-center gap-1 truncate">
                        <Lock size={10} /> Ditangani oleh {session.csHandlerName}
                      </p>
                    )}
                    {isMine && (
                      <p className="text-green-600 flex items-center gap-1">
                        <CheckCircle size={10} /> Ditangani oleh Anda
                      </p>
                    )}
                  </div>
                  {session.csActive ? (
                    <button
                      onClick={() => isMine || isTaken ? setSelectedSession(session) : handleClaim(session)}
                      className={cn(
                        'text-xs font-semibold px-4 py-1.5 rounded-xl transition-all shrink-0',
                        isTaken ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'text-white hover:opacity-90'
                      )}
                      style={!isTaken ? { backgroundColor: 'var(--epson-blue-mid)' } : {}}
                    >
                      {isMine ? 'Lanjutkan' : isTaken ? 'Lihat' : 'Ambil'}
                    </button>
                  ) : (
                    <button onClick={() => setSelectedSession(session)} className="text-xs font-semibold px-4 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all shrink-0">
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