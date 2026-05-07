import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export default function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Semua field harus diisi'); return; }
    const ok = await login(email, password);
    if (!ok) setError('Email atau kata sandi salah. Coba: admin@epson.com atau user@epson.com');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="flex-1 flex flex-col justify-center px-16 bg-white">
        <div className="max-w-md">
          <div className="flex items-baseline gap-1 mb-6">
            <span className="font-black text-5xl text-epson-blue tracking-tight">EPSON</span>
            <span className="text-epson-blue/50 text-sm align-top mt-2">®</span>
            <span className="font-light text-5xl text-epson-blue ml-2">Support</span>
          </div>
          <p className="text-epson-blue font-semibold text-sm mb-2">AI Helpdesk Assistant</p>
          <p className="text-gray-600 text-sm leading-relaxed">
            <strong>Perlu bantuan?</strong> Cobalah AI Support kami untuk membantu anda terkait produk Epson.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-[480px] bg-epson-blue flex items-center justify-center px-12">
        <div className="w-full">
          <div className="mb-10">
            <div className="flex items-baseline gap-1">
              <span className="font-black text-xl text-white tracking-tight">EPSON</span>
              <span className="text-white/50 text-xs align-top mt-1">®</span>
              <span className="font-light text-xl text-white ml-1">Support</span>
            </div>
            <p className="text-white/60 text-xs mt-0.5">AI Helpdesk Assistant</p>
          </div>

          <div className="bg-epson-blue-light/40 backdrop-blur rounded-2xl p-8">
            <h2 className="text-white text-xl font-bold text-center mb-6">Selamat Datang</h2>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/20 text-red-200 text-xs rounded-xl px-4 py-3 mb-4">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 mb-4">
              <input
                type="email"
                placeholder="Alamat email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
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
              {isLoading ? 'Masuk...' : 'Masuk'}
            </button>

            <p className="text-center text-white/60 text-xs mt-5">
              Belum punya akun?{' '}
              <button onClick={onSwitchToRegister} className="text-white font-semibold underline hover:no-underline">
                klik disini
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
