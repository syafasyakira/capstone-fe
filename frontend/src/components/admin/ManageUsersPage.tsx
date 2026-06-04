import React, { useState } from 'react';
import { SidebarNav } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Plus, Trash2, X, AlertCircle, CheckCircle } from 'lucide-react';

export default function ManageUsersPage() {
  const { csUsers, addCSUser, removeCSUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setError('');
    setSuccess('');
    if (!name || !email || !password) { setError('Semua field harus diisi'); return; }
    if (password.length < 6) { setError('Password minimal 6 karakter'); return; }
    setLoading(true);
    const ok = await addCSUser(name, email, password);
    setLoading(false);
    if (!ok) { setError('Email sudah terdaftar'); return; }
    setSuccess(`Akun CS "${name}" berhasil ditambahkan`);
    setName(''); setEmail(''); setPassword('');
    setTimeout(() => { setShowModal(false); setSuccess(''); }, 1500);
  };

  const handleRemove = (id: string, userName: string) => {
    if (!confirm(`Hapus akun CS "${userName}"?`)) return;
    removeCSUser(id);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <SidebarNav />
      <div className="flex-1 bg-gray-50 overflow-y-auto px-6 py-8">
        <div className="pl-12 sm:pl-0 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={26} style={{ color: 'var(--epson-blue)' }} /> Kelola Akun CS
            </h1>
            <p className="text-sm text-gray-500 mt-1">Tambah dan kelola akun Customer Service</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setError(''); setSuccess(''); }}
            className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
            style={{ backgroundColor: 'var(--epson-blue-mid)' }}
          >
            <Plus size={16} /> Tambah CS
          </button>
        </div>

        {/* List CS */}
        <div className="max-w-2xl flex flex-col gap-3">
          {csUsers.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400">
              <Users size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Belum ada akun CS. Klik "Tambah CS" untuk menambahkan.</p>
            </div>
          ) : (
            csUsers.map(cs => (
              <div key={cs.id} className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
                    {cs.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{cs.name}</p>
                    <p className="text-xs text-gray-400">{cs.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(cs.id, cs.name)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all"
                  title="Hapus akun"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal tambah CS */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-800 text-lg">Tambah Akun CS</h2>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                  <X size={18} />
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs rounded-xl px-4 py-3 mb-4">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 bg-green-50 text-green-600 text-xs rounded-xl px-4 py-3 mb-4">
                  <CheckCircle size={14} /> {success}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <input
                  type="text" placeholder="Nama CS" value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <input
                  type="email" placeholder="Email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <input
                  type="password" placeholder="Password (min. 6 karakter)" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-all">
                  Batal
                </button>
                <button onClick={handleAdd} disabled={loading}
                  className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60"
                  style={{ backgroundColor: 'var(--epson-blue-mid)' }}>
                  {loading ? 'Menyimpan...' : 'Tambah'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
