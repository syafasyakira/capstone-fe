// src/pages/admin/KnowledgeBasePage.tsx

import React, { useState, useEffect } from 'react';
import { SidebarNav } from '@/components/layout/AppLayout';
import { BookOpen, Plus, Pencil, Trash2, X, AlertCircle, CheckCircle, Search, Loader2 } from 'lucide-react';
import { getKnowledge, addKnowledge, updateKnowledge, deleteKnowledge, KnowledgeItem } from '@/services/api';

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [query, setQuery] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await getKnowledge();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
      setFetchError('Gagal memuat data. Pastikan database dan backend berjalan.');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  const openEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    // Toleransi jika database menggunakan kolom Indonesia (pertanyaan/jawaban)
    setFormQuestion(item.question || (item as any).pertanyaan || '');
    setFormAnswer(item.answer || (item as any).jawaban || '');
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError('');
    setFormSuccess('');
    if (!formQuestion.trim() || !formAnswer.trim()) {
      setFormError('Pertanyaan dan jawaban tidak boleh kosong');
      return;
    }
    setFormLoading(true);
    try {
      if (editingItem) {
        const updated = await updateKnowledge(editingItem.id, { 
          question: formQuestion.trim(), 
          answer: formAnswer.trim() 
        });
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
        setFormSuccess('Data berhasil diperbarui');
      } else {
        const added = await addKnowledge({ 
          question: formQuestion.trim(), 
          answer: formAnswer.trim() 
        });
        setItems(prev => [added, ...prev]);
        setFormSuccess('Data berhasil ditambahkan');
      }
      setTimeout(() => { setShowModal(false); setFormSuccess(''); fetchItems(); }, 1200);
    } catch (err: any) {
      setFormError('Gagal menyimpan data ke sistem. Coba lagi.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (item: KnowledgeItem) => {
    const itemQuestion = item.question || (item as any).pertanyaan || 'Data ini';
    if (!confirm(`Hapus pertanyaan "${itemQuestion}"?`)) return;
    try {
      await deleteKnowledge(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {
      alert('Gagal menghapus data dari database.');
    }
  };

  // 🔥 FIX UTAMA ANTI-BLANK: Mengamankan fungsi toLowerCase() dengan Fallback String Kosong
  const filtered = items.filter(i => {
    const q = (i.question || (i as any).pertanyaan || '').toLowerCase();
    const a = (i.answer || (i as any).jawaban || '').toLowerCase();
    const search = (query || '').toLowerCase();
    return q.includes(search) || a.includes(search);
  });

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <SidebarNav />
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 w-full">
        
        {/* Header & Action Area */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
          <div className="pl-12 sm:pl-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="flex items-center gap-2">
                <BookOpen size={24} style={{ color: 'var(--epson-blue)' }} /> 
                Knowledge Base
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Data pertanyaan & jawaban untuk RAG AI — tersimpan di <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold">Supabase PostgreSQL</code> dan disinkronkan ke cache <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] sm:text-xs">CSV RAG</code>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-2 lg:mt-0 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64 lg:w-80 shadow-sm rounded-xl">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cari data..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-[13px] sm:text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
              />
            </div>
            
            <button
              onClick={openAdd}
              className="flex items-center justify-center gap-1.5 text-white text-[13px] sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shrink-0 shadow-sm"
              style={{ backgroundColor: 'var(--epson-blue-mid)' }}
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> Tambah Data
            </button>
          </div>
        </div>

        {/* Content / List Data */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2 text-sm">
            <Loader2 size={18} className="animate-spin" /> Memuat data...
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-400 gap-2">
            <AlertCircle size={32} className="opacity-60" />
            <p className="text-xs sm:text-sm">{fetchError}</p>
            <button onClick={fetchItems} className="text-xs text-blue-500 underline mt-1">Coba lagi</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white border border-gray-100 rounded-xl sm:rounded-2xl shadow-sm">
            <BookOpen size={36} className="mb-3 opacity-40 sm:w-10 sm:h-10" />
            <p className="text-xs sm:text-sm">{query ? 'Tidak ada hasil pencarian' : 'Belum ada data di database. Klik "Tambah Data" untuk mulai.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
            {filtered.map((item, idx) => (
              <div key={item.id} className="bg-white border border-gray-100 sm:border-gray-200 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 shadow-sm transition-all hover:shadow-md flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                
                <div className="flex items-start gap-2.5 sm:gap-4 flex-1 min-w-0 w-full">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-sm font-bold shrink-0 text-white shadow-inner"
                    style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0 pt-0.5">
                    {/* Mengantisipasi toleransi render jika properti berstruktur Indonesia */}
                    <p className="font-semibold text-gray-800 text-[13px] sm:text-base mb-1.5 line-clamp-2">
                      {item.question || (item as any).pertanyaan || ''}
                    </p>
                    <p className="text-[11px] sm:text-sm text-gray-500 leading-relaxed line-clamp-2 sm:line-clamp-3">
                      {item.answer || (item as any).jawaban || ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end mt-1 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-50">
                  <button onClick={() => openEdit(item)}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 hover:bg-blue-100 transition-all"
                    style={{ color: 'var(--epson-blue-mid)' }} title="Edit">
                    <Pencil size={14} className="sm:w-4 sm:h-4" />
                  </button>
                  <button onClick={() => handleDelete(item)}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg sm:rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all" title="Hapus">
                    <Trash2 size={14} className="sm:w-4 sm:h-4" />
                  </button>
                </div>

              </div>
            ))}
            <p className="text-[10px] sm:text-xs text-gray-400 text-center mt-3">{filtered.length} dari {items.length} data</p>
          </div>
        )}

        {/* Modal tambah/edit */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-0 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-5 sm:p-7 w-full max-w-lg shadow-2xl max-h-[90dvh] flex flex-col">
              
              <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0">
                <h2 className="font-bold text-gray-800 text-base sm:text-xl">
                  {editingItem ? 'Edit Data' : 'Tambah Data Baru'}
                </h2>
                <button onClick={() => setShowModal(false)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {formError && (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-600 text-[11px] sm:text-xs rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 mb-3 sm:mb-4">
                    <AlertCircle size={14} className="shrink-0" /> {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-600 text-[11px] sm:text-xs rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 mb-3 sm:mb-4">
                    <CheckCircle size={14} className="shrink-0" /> {formSuccess}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:gap-4">
                  <div>
                    <label className="text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 block px-1">Pertanyaan</label>
                    <input
                      type="text"
                      value={formQuestion}
                      onChange={e => setFormQuestion(e.target.value)}
                      placeholder="Contoh: Bagaimana cara membersihkan head printer?"
                      className="w-full border border-gray-200 rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 block px-1">Jawaban</label>
                    <textarea
                      value={formAnswer}
                      onChange={e => setFormAnswer(e.target.value)}
                      placeholder="Tulis jawaban lengkap di sini..."
                      rows={5}
                      className="w-full border border-gray-200 rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all resize-none placeholder:text-gray-300"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 sm:gap-3 mt-5 sm:mt-7 shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[13px] sm:text-sm transition-all">
                  Batal
                </button>
                <button onClick={handleSave} disabled={formLoading}
                  className="flex-1 text-white font-semibold py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[13px] sm:text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                  style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
                  {formLoading ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : 'Simpan'}
                </button>
              </div>
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}