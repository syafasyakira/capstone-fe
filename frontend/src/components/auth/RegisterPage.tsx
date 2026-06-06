import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export default function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!name || !email || !password) { setError('Semua field harus diisi'); return; }
    if (password.length < 6) { setError('Kata sandi minimal 6 karakter'); return; }
    const success = await register(name, email, password);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel (Disembunyikan di mobile) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-8 py-10 lg:px-16 lg:py-0 bg-white">
        <div className="max-w-xl mx-auto">
          <div className="flex flex-col gap-2 mb-6 lg:flex-row lg:items-end lg:gap-4">
            <div className="flex items-baseline gap-1">
              <span className="font-black text-5xl text-epson-blue tracking-tight">EPSON</span>
              <span className="text-epson-blue/50 text-sm align-top mt-2">®</span>
            </div>
            <span className="font-light text-5xl text-epson-blue">Support</span>
          </div>
          <p className="text-epson-blue font-semibold text-sm mb-2">AI Helpdesk Assistant</p>
          <p className="text-gray-600 text-sm leading-relaxed">
            <strong>Perlu bantuan?</strong> Cobalah AI Support kami untuk membantu kendala anda terkait produk Epson.
          </p>
        </div>
      </div>

      {/* Right form panel (Ditambahkan class "relative") */}
      <div className="flex-1 lg:flex-none w-full lg:w-[480px] bg-epson-blue flex items-center justify-center px-6 py-10 lg:px-12 lg:py-0 relative">
        <div className="w-full max-w-md">
          
          {/* Logo ditarik ke atas-kiri saat di mobile dengan "absolute top-8 left-6", desktop kembali normal */}
          <div className="absolute top-8 left-6 lg:static lg:mb-10 text-left">
            <div className="flex items-baseline justify-start gap-1">
              <span className="font-black text-xl text-white tracking-tight">EPSON</span>
              <span className="text-white/50 text-xs align-top mt-1">®</span>
              <span className="font-light text-xl text-white ml-1">Support</span>
            </div>
            <p className="text-white/60 text-xs mt-0.5">AI Helpdesk Assistant</p>
          </div>

          <div className="bg-epson-blue-light/40 backdrop-blur rounded-2xl p-8 mt-10 lg:mt-0">
            <h2 className="text-white text-xl font-bold text-center mb-6">Buat Akun</h2>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/20 text-red-200 text-xs rounded-xl px-4 py-3 mb-4">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 mb-4">
              <input
                type="text"
                placeholder="Nama"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/15 text-white placeholder-white/50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white/25 transition-all"
              />
              <input
                type="email"
                placeholder="Alamat email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/15 text-white placeholder-white/50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white/25 transition-all"
              />
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className="w-full bg-white/15 text-white placeholder-white/50 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:bg-white/25 transition-all"
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-100 text-epson-blue font-bold py-3 rounded-xl transition-all text-sm disabled:opacity-60"
            >
              {isLoading ? 'Mendaftar...' : 'Daftar'}
            </button>

            <p className="text-center text-white/60 text-xs mt-5">
              Sudah punya akun?{' '}
              <button onClick={onSwitchToLogin} className="text-white font-semibold underline hover:no-underline">
                klik disini
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}