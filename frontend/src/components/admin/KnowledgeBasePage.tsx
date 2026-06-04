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
      setItems(data);
    } catch {
      setFetchError('Gagal memuat data. Pastikan backend berjalan.');
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
    setFormQuestion(item.question);
    setFormAnswer(item.answer);
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
        const updated = await updateKnowledge(editingItem.id, { question: formQuestion.trim(), answer: formAnswer.trim() });
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
        setFormSuccess('Data berhasil diperbarui');
      } else {
        const added = await addKnowledge({ question: formQuestion.trim(), answer: formAnswer.trim() });
        setItems(prev => [...prev, added]);
        setFormSuccess('Data berhasil ditambahkan');
      }
      setTimeout(() => { setShowModal(false); setFormSuccess(''); }, 1200);
    } catch {
      setFormError('Gagal menyimpan data. Coba lagi.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (item: KnowledgeItem) => {
    if (!confirm(`Hapus pertanyaan "${item.question}"?`)) return;
    try {
      await deleteKnowledge(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {
      alert('Gagal menghapus data.');
    }
  };

  const filtered = items.filter(
    i =>
      i.question.toLowerCase().includes(query.toLowerCase()) ||
      i.answer.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <SidebarNav />
      <div className="flex-1 bg-gray-50 overflow-y-auto px-6 py-8">
        {/* Header */}
        <div className="pl-12 sm:pl-0 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen size={26} style={{ color: 'var(--epson-blue)' }} /> Knowledge Base
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Data pertanyaan & jawaban untuk RAG AI — tersimpan ke <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">faq_dummy_data.csv</code>
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
            style={{ backgroundColor: 'var(--epson-blue-mid)' }}
          >
            <Plus size={16} /> Tambah Data
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mb-6">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari pertanyaan atau jawaban..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 size={20} className="animate-spin" /> Memuat data...
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-400 gap-2">
            <AlertCircle size={36} className="opacity-60" />
            <p className="text-sm">{fetchError}</p>
            <button onClick={fetchItems} className="text-xs text-blue-500 underline mt-1">Coba lagi</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <BookOpen size={36} className="mb-3 opacity-40" />
            <p className="text-sm">{query ? 'Tidak ada hasil pencarian' : 'Belum ada data. Klik "Tambah Data" untuk mulai.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-3xl">
            {filtered.map((item, idx) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-white"
                      style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm mb-1">{item.question}</p>
                      <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{item.answer}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(item)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 transition-all"
                      style={{ color: 'var(--epson-blue-mid)' }} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(item)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all" title="Hapus">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 text-center mt-2">{filtered.length} dari {items.length} data</p>
          </div>
        )}
      </div>

      {/* Modal tambah/edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800 text-lg">
                {editingItem ? 'Edit Data' : 'Tambah Data Baru'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs rounded-xl px-4 py-3 mb-4">
                <AlertCircle size={14} /> {formError}
              </div>
            )}
            {formSuccess && (
              <div className="flex items-center gap-2 bg-green-50 text-green-600 text-xs rounded-xl px-4 py-3 mb-4">
                <CheckCircle size={14} /> {formSuccess}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Pertanyaan</label>
                <input
                  type="text"
                  value={formQuestion}
                  onChange={e => setFormQuestion(e.target.value)}
                  placeholder="Contoh: Bagaimana cara membersihkan head printer?"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Jawaban</label>
                <textarea
                  value={formAnswer}
                  onChange={e => setFormAnswer(e.target.value)}
                  placeholder="Tulis jawaban lengkap di sini..."
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-all">
                Batal
              </button>
              <button onClick={handleSave} disabled={formLoading}
                className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
                {formLoading ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
