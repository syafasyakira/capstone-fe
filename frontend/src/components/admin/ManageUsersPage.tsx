import React, { useState } from 'react';
import { SidebarNav } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Plus, Trash2, X, AlertCircle, CheckCircle, Pencil } from 'lucide-react';

export default function ManageUsersPage() {
  // Tambahkan updateCSUser di Context Anda nantinya
  const { csUsers, addCSUser, removeCSUser, updateCSUser } = useAuth() as any; 
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setModalMode('add');
    setName(''); setEmail(''); setPassword('');
    setError(''); setSuccess('');
    setShowModal(true);
  };

  const openEditModal = (cs: any) => {
    setModalMode('edit');
    setEditId(cs.id);
    setName(cs.name);
    setEmail(cs.email);
    setPassword(''); // Kosongkan password saat edit
    setError(''); setSuccess('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!name || !email) { setError('Nama dan Email harus diisi'); return; }

    setLoading(true);

    if (modalMode === 'add') {
      if (!password || password.length < 6) { 
        setError('Password minimal 6 karakter'); setLoading(false); return; 
      }
      const ok = await addCSUser(name, email, password);
      setLoading(false);
      if (!ok) { setError('Email sudah terdaftar'); return; }
      setSuccess(`Akun CS "${name}" berhasil ditambahkan`);
    } else {
      // Edit Mode
      if (password && password.length < 6) { 
        setError('Password baru minimal 6 karakter'); setLoading(false); return; 
      }
      // Panggil fungsi update dari context
      const ok = await updateCSUser?.(editId, name, email, password) ?? true; 
      setLoading(false);
      if (!ok) { setError('Gagal memperbarui akun'); return; }
      setSuccess(`Akun CS "${name}" berhasil diperbarui`);
    }

    setTimeout(() => { 
      setShowModal(false); 
      setSuccess(''); 
      setName(''); setEmail(''); setPassword(''); 
    }, 1500);
  };

  const handleRemove = (id: string, userName: string) => {
    if (!confirm(`Hapus akun CS "${userName}"?`)) return;
    removeCSUser(id);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <SidebarNav />
      
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 w-full">
        
        {/* Header & Action Area - Dibuat selalu sejajar (flex-row) */}
        <div className="flex flex-row items-center justify-between gap-3 mb-6 sm:mb-8">
          
          {/* Sisi Kiri: Judul dan Deskripsi */}
          <div className="pl-12 sm:pl-0 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-1.5 sm:gap-2">
              <Users size={22} className="sm:w-[26px] sm:h-[26px] shrink-0" style={{ color: 'var(--epson-blue)' }} /> 
              <span className="truncate">Kelola Akun</span>
            </h1>
            <p className="text-[10px] sm:text-sm text-gray-500 mt-1 hidden sm:block">
              Tambah dan kelola akun Customer Service
            </p>
          </div>
          
          {/* Sisi Kanan: Tombol Tambah (Tetap di kanan berkat flex-row & justify-between) */}
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-1.5 text-white text-[11px] sm:text-sm font-semibold px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl transition-all shrink-0 shadow-sm"
            style={{ backgroundColor: 'var(--epson-blue-mid)' }}
          >
            <Plus size={14} className="sm:w-[16px] sm:h-[16px]" /> Tambah CS
          </button>

        </div>

        {/* List CS - Full Width */}
        <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
          {csUsers.length === 0 ? (
            <div className="bg-white border border-gray-100 sm:border-gray-200 rounded-xl sm:rounded-2xl p-6 sm:p-10 text-center text-gray-400 shadow-sm">
              <Users size={36} className="mx-auto mb-3 opacity-40 sm:w-12 sm:h-12" />
              <p className="text-xs sm:text-sm">Belum ada akun CS. Klik "Tambah CS" untuk menambahkan.</p>
            </div>
          ) : (
            csUsers.map((cs: any) => (
              <div key={cs.id} className="bg-white border border-gray-100 sm:border-gray-200 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 shadow-sm transition-all hover:shadow-md flex flex-row items-center justify-between gap-3 sm:gap-4">
                
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shrink-0 shadow-inner"
                    style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
                    {cs.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-semibold text-gray-800 text-[13px] sm:text-base truncate">{cs.name}</p>
                    <p className="text-[11px] sm:text-sm text-gray-500 truncate mt-0.5">{cs.email}</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={() => openEditModal(cs)}
                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all"
                    title="Edit akun"
                  >
                    <Pencil size={14} className="sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(cs.id, cs.name)}
                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all"
                    title="Hapus akun"
                  >
                    <Trash2 size={14} className="sm:w-4 sm:h-4" />
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-0 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-5 sm:p-7 w-full max-w-md shadow-2xl max-h-[90dvh] flex flex-col">
              
              <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0">
                <h2 className="font-bold text-gray-800 text-base sm:text-xl">
                  {modalMode === 'add' ? 'Tambah Akun CS' : 'Edit Akun CS'}
                </h2>
                <button onClick={() => setShowModal(false)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {error && (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-600 text-[11px] sm:text-xs rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 mb-3 sm:mb-4">
                    <AlertCircle size={14} className="shrink-0" /> {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-600 text-[11px] sm:text-xs rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 mb-3 sm:mb-4">
                    <CheckCircle size={14} className="shrink-0" /> {success}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:gap-4">
                  <div>
                    <label className="text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 block px-1">Nama Lengkap</label>
                    <input
                      type="text" placeholder="Masukkan nama CS..." value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 block px-1">Alamat Email</label>
                    <input
                      type="email" placeholder="contoh@epson.com" value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] sm:text-xs font-semibold text-gray-600 mb-1.5 block px-1">
                      Password {modalMode === 'edit' && '(Opsional)'}
                    </label>
                    <input
                      type="password" 
                      placeholder={modalMode === 'add' ? "Minimal 6 karakter" : "Kosongkan jika tidak ingin ganti"} 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSave()}
                      className="w-full border border-gray-200 rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 sm:gap-3 mt-5 sm:mt-7 shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[13px] sm:text-sm transition-all">
                  Batal
                </button>
                <button onClick={handleSave} disabled={loading}
                  className="flex-1 text-white font-semibold py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[13px] sm:text-sm transition-all disabled:opacity-60 shadow-sm"
                  style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}