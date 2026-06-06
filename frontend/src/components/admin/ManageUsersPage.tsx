import React, { useState, useEffect, useMemo } from 'react';
import { SidebarNav } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getCSUsers, createCSUser, deleteCSUser, updateCSUser as updateCSUserAPI } from '@/services/api';
import { Users, Plus, Trash2, X, AlertCircle, CheckCircle, Pencil, Search, ShieldCheck, User } from 'lucide-react';

type RoleFilter = 'all' | 'customer' | 'customer_service';

export default function ManageUsersPage() {
  const { user: adminUser } = useAuth();

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState('');
  const [modalRole, setModalRole] = useState<'customer' | 'customer_service'>('customer_service');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getCSUsers(); // returns ALL users (all roles)
      setAllUsers(data.users || []);
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const getDisplayName = (u: any) => u.full_name || u.name || u.email || '?';

  const filteredUsers = useMemo(() => {
    let list = allUsers.filter(u => u.id !== adminUser?.id); // exclude self
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u =>
        getDisplayName(u).toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allUsers, roleFilter, searchQuery, adminUser]);

  const openAddModal = (role: 'customer' | 'customer_service' = 'customer_service') => {
    setModalMode('add');
    setModalRole(role);
    setName(''); setEmail(''); setPassword('');
    setError(''); setSuccess('');
    setShowModal(true);
  };

  const openEditModal = (u: any) => {
    setModalMode('edit');
    setEditId(u.id);
    setModalRole(u.role);
    setName(getDisplayName(u));
    setEmail(u.email || '');
    setPassword('');
    setError(''); setSuccess('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError(''); setSuccess('');
    if (!name || !email) { setError('Nama dan Email harus diisi'); return; }
    setLoading(true);

    if (modalMode === 'add') {
      if (!password || password.length < 6) { setError('Password minimal 6 karakter'); setLoading(false); return; }
      try {
        await createCSUser(email, password, name, modalRole);
        await fetchUsers();
        setSuccess(`Akun "${name}" berhasil ditambahkan`);
      } catch (e: any) {
        setError(e.message || 'Gagal membuat akun');
        setLoading(false); return;
      }
    } else {
      if (password && password.length < 6) { setError('Password baru minimal 6 karakter'); setLoading(false); return; }
      try {
        await updateCSUserAPI(editId, name, email, password || undefined);
        await fetchUsers();
        setSuccess(`Akun "${name}" berhasil diperbarui`);
      } catch (e: any) {
        setError(e.message || 'Gagal memperbarui akun');
        setLoading(false); return;
      }
    }

    setLoading(false);
    setTimeout(() => { setShowModal(false); setSuccess(''); setName(''); setEmail(''); setPassword(''); }, 1500);
  };

  const handleRemove = async (id: string, displayName: string) => {
    if (!confirm(`Hapus akun "${displayName}"?`)) return;
    try {
      await deleteCSUser(id);
      setAllUsers(prev => prev.filter(u => u.id !== id));
    } catch (e) { alert('Gagal menghapus akun'); }
  };

  const csCount = allUsers.filter(u => u.role === 'customer_service').length;
  const custCount = allUsers.filter(u => u.role === 'customer').length;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <SidebarNav />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 w-full">

        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-3 mb-6 pl-12 sm:pl-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={22} style={{ color: 'var(--epson-blue)' }} />
              Kelola Akun
            </h1>
            <p className="text-sm text-gray-500 mt-1 hidden sm:block">
              {csCount} Customer Service · {custCount} Customer
            </p>
          </div>
          <button
            onClick={() => openAddModal('customer_service')}
            className="flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
            style={{ backgroundColor: 'var(--epson-blue-mid)' }}
          >
            <Plus size={15} /> Tambah Akun
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 max-w-2xl">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full bg-white border border-gray-200 rounded-2xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'customer_service', 'customer'] as RoleFilter[]).map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${roleFilter === r ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                style={roleFilter === r ? { backgroundColor: 'var(--epson-blue-mid)' } : {}}
              >
                {r === 'all' ? 'Semua' : r === 'customer_service' ? 'CS' : 'Customer'}
              </button>
            ))}
          </div>
        </div>

        {/* User List */}
        <div className="flex flex-col gap-2.5 max-w-2xl">
          {loadingUsers ? (
            <div className="text-center py-12 text-gray-400 text-sm">Memuat data...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-400 shadow-sm">
              <Users size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Tidak ada akun ditemukan</p>
            </div>
          ) : (
            filteredUsers.map((u: any) => {
              const displayName = getDisplayName(u);
              const isCS = u.role === 'customer_service';
              return (
                <div key={u.id} className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                      style={{ backgroundColor: isCS ? 'var(--epson-blue-mid)' : '#6b7280' }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-sm truncate">{displayName}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCS ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          {isCS ? 'CS' : 'Customer'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openEditModal(u)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleRemove(u.id, displayName)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-800 text-lg">
                  {modalMode === 'add' ? 'Tambah Akun' : 'Edit Akun'}
                </h2>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                  <X size={16} />
                </button>
              </div>

              {error && <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-4 py-3 mb-4"><AlertCircle size={14} className="shrink-0" /> {error}</div>}
              {success && <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-600 text-xs rounded-xl px-4 py-3 mb-4"><CheckCircle size={14} className="shrink-0" /> {success}</div>}

              <div className="flex flex-col gap-4">
                {/* Role selector — hanya tampil saat add */}
                {modalMode === 'add' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-2 block">Tipe Akun</label>
                    <div className="flex gap-2">
                      {(['customer_service', 'customer'] as const).map(r => (
                        <button key={r} onClick={() => setModalRole(r)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${modalRole === r ? 'text-white border-transparent' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                          style={modalRole === r ? { backgroundColor: 'var(--epson-blue-mid)' } : {}}
                        >
                          {r === 'customer_service' ? <ShieldCheck size={15} /> : <User size={15} />}
                          {r === 'customer_service' ? 'Customer Service' : 'Customer'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Nama Lengkap</label>
                  <input type="text" placeholder="Masukkan nama..." value={name} onChange={e => setName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Alamat Email</label>
                  <input type="email" placeholder="email@epson.com" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                    Password {modalMode === 'edit' && <span className="font-normal text-gray-400">(Opsional)</span>}
                  </label>
                  <input type="password"
                    placeholder={modalMode === 'add' ? 'Minimal 6 karakter' : 'Kosongkan jika tidak ingin ganti'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-all">Batal</button>
                <button onClick={handleSave} disabled={loading}
                  className="flex-1 text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-60 shadow-sm"
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
