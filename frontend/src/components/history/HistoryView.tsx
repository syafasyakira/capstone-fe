import React, { useState, useMemo } from 'react';
import { Search, CheckCircle, Clock, History, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';
import { ChatSession } from '@/types';
import { cn } from '@/utils/cn';

type Filter = 'all' | 'solved' | 'unsolved';
const ITEMS_PER_PAGE = 5;

interface HistoryViewProps {
  onSelectSession?: () => void | Promise<void>;
}

export default function HistoryView({ onSelectSession }: HistoryViewProps) {
  const { sessions, loadSession } = useChat();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const matchQuery =
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.preview.toLowerCase().includes(query.toLowerCase());
      const matchFilter =
        filter === 'all' ||
        (filter === 'solved' && s.status === 'solved') ||
        (filter === 'unsolved' && s.status !== 'solved');
      return matchQuery && matchFilter;
    });
  }, [sessions, query, filter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const grouped = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      today: paginated.filter(s => new Date(s.timestamp) >= today),
      week: paginated.filter(s => new Date(s.timestamp) >= weekAgo && new Date(s.timestamp) < today),
      older: paginated.filter(s => new Date(s.timestamp) < weekAgo),
    };
  }, [paginated]);

  const handleSelect = (session: ChatSession) => {
    loadSession(session.id);
    if (onSelectSession) onSelectSession();
    navigate('/chat');
  };

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const StatusBadge = ({ session }: { session: ChatSession }) => {
    if (session.csActive) return (
      <span className="flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
        <Clock size={12} /> Menunggu CS
      </span>
    );
    if (session.status === 'solved') return (
      <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full">
        <CheckCircle size={12} /> Terselesaikan
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-600 px-3 py-1 rounded-full">
        <XCircle size={12} /> Tidak Terselesaikan
      </span>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-epson-blue font-semibold text-sm">{label}</span>
      <div className="flex-1 h-px bg-blue-100" />
    </div>
  );

  const SessionCard = ({ session }: { session: ChatSession }) => (
    <div
      className="bg-white border border-gray-100 rounded-xl p-4 mb-2 cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all"
      onClick={() => handleSelect(session)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{session.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(session.timestamp)}</p>
          <p className="text-sm text-gray-500 mt-2 truncate">"{session.preview || 'Tidak ada preview'}"</p>
        </div>
        <StatusBadge session={session} />
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-4 sm:px-8 bg-gray-50 border-b border-gray-100">
        <div className="relative max-w-2xl mx-auto pl-12 sm:pl-0">
          <Search size={16} className="absolute left-16 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="Cari riwayat percakapan..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <History size={24} style={{ color: 'var(--epson-blue)' }} /> History
          </h1>
          <p className="text-sm text-gray-500 mt-1">Riwayat percakapan Anda</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'solved', 'unsolved'] as Filter[]).map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                filter === f
                  ? 'text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
              )}
              style={filter === f ? { backgroundColor: 'var(--epson-blue-mid)' } : {}}
            >
              {f === 'all' ? 'Semua' : f === 'solved' ? 'Terselesaikan' : 'Tidak Terselesaikan'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <History size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Tidak ada riwayat percakapan</p>
          </div>
        ) : (
          <>
            {grouped.today.length > 0 && <div className="mb-6"><SectionLabel label="Hari Ini" />{grouped.today.map(s => <SessionCard key={s.id} session={s} />)}</div>}
            {grouped.week.length > 0 && <div className="mb-6"><SectionLabel label="Minggu Ini" />{grouped.week.map(s => <SessionCard key={s.id} session={s} />)}</div>}
            {grouped.older.length > 0 && <div className="mb-6"><SectionLabel label="Lebih Lama" />{grouped.older.map(s => <SessionCard key={s.id} session={s} />)}</div>}
          </>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('w-8 h-8 rounded-lg text-sm font-medium transition-all', page === p ? 'text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')}
                style={page === p ? { backgroundColor: 'var(--epson-blue-mid)' } : {}}>{p}</button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40">›</button>
          </div>
        )}
      </div>
    </div>
  );
}
