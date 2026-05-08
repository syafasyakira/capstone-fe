import React, { useState, useMemo } from 'react';
import { Search, CheckCircle, Clock, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';
import { ChatSession } from '@/types';
import { cn } from '@/utils/cn';

type Filter = 'all' | 'solved' | 'unsolved';

const ITEMS_PER_PAGE = 5;

/**
 * Interface untuk Props HistoryView
 * Menambahkan onSelectSession agar sesuai dengan pemanggilan di HistoryPage
 */
interface HistoryViewProps {
  onSelectSession?: () => void | Promise<void>;
}

export default function HistoryView({ onSelectSession }: HistoryViewProps) {
  const { sessions, loadSession } = useChat(); 
  const navigate = useNavigate();
  
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);

  // 1. Logika Filtering
  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const matchQuery =
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.preview.toLowerCase().includes(query.toLowerCase());
      const matchFilter =
        filter === 'all' ||
        (filter === 'solved' && s.status === 'solved') ||
        (filter === 'unsolved' && s.status === 'unsolved');
      return matchQuery && matchFilter;
    });
  }, [sessions, query, filter]);

  // 2. Logika Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // 3. Logika Grouping Waktu
  const grouped = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      today: paginated.filter((s) => new Date(s.timestamp) >= today),
      week: paginated.filter((s) => new Date(s.timestamp) >= weekAgo && new Date(s.timestamp) < today),
      older: paginated.filter((s) => new Date(s.timestamp) < weekAgo),
    };
  }, [paginated]);

  // 4. Handler Navigasi yang Diperbaiki
  const handleSelectSession = (id: string) => {
    loadSession(id); // Memastikan data dimuat ke context
    
    // Panggil onSelectSession jika dilewatkan sebagai props (dari HistoryPage)
    if (onSelectSession) {
      onSelectSession();
    }
    
    navigate(`/chat/${id}`); // Navigasi ke URL spesifik
  };

  const formatTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // --- SUB-COMPONENTS ---
  const StatusBadge = ({ status }: { status: 'solved' | 'unsolved' }) =>
    status === 'solved' ? (
      <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full">
        <CheckCircle size={12} /> Terselesaikan
      </span>
    ) : (
      <span className="flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
        <Clock size={12} /> Tidak Terselesaikan
      </span>
    );

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-epson-blue font-semibold text-sm">{label}</span>
      <div className="flex-1 h-px bg-blue-100" />
    </div>
  );

  const SessionCard = ({ session }: { session: ChatSession }) => (
    <div 
      className="history-card cursor-pointer hover:bg-gray-50 transition-colors border border-gray-100 p-4 rounded-xl mb-2" 
      onClick={() => handleSelectSession(session.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{session.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            kode chat - {formatTime(session.timestamp)}
          </p>
          <p className="text-sm text-gray-500 mt-2 truncate">"{session.preview || 'Tidak ada preview'}"</p>
        </div>
        <StatusBadge status={session.status} />
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Search bar */}
      <div className="px-8 py-4 bg-gray-50 border-b border-gray-100">
        <div className="relative max-w-2xl">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Cari riwayat percakapan anda..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-epson-accent/50 focus:ring-2 focus:ring-epson-accent/10 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <History size={24} className="text-epson-blue" /> History
          </h1>
          <p className="text-sm text-gray-500 mt-1">Riwayat percakapan anda</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'solved', 'unsolved'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={cn(
                'px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                filter === f
                  ? 'bg-epson-blue-mid text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-epson-accent/50'
              )}
            >
              {f === 'all' ? 'Semua' : f === 'solved' ? 'Terselesaikan' : 'Tidak Terselesaikan'}
            </button>
          ))}
        </div>

        {/* Sessions grouped */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <History size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Tidak ada riwayat percakapan</p>
          </div>
        ) : (
          <>
            {grouped.today.length > 0 && (
              <div className="mb-6">
                <SectionLabel label="Hari Ini" />
                <div className="flex flex-col gap-3">
                  {grouped.today.map((s) => <SessionCard key={s.id} session={s} />)}
                </div>
              </div>
            )}
            {grouped.week.length > 0 && (
              <div className="mb-6">
                <SectionLabel label="Minggu Lalu" />
                <div className="flex flex-col gap-3">
                  {grouped.week.map((s) => <SessionCard key={s.id} session={s} />)}
                </div>
              </div>
            )}
            {grouped.older.length > 0 && (
              <div className="mb-6">
                <SectionLabel label="Lebih Lama" />
                <div className="flex flex-col gap-3">
                  {grouped.older.map((s) => <SessionCard key={s.id} session={s} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                  page === p
                    ? 'bg-epson-blue-mid text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}