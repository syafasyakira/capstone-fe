import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BotMessageSquare, History, BarChart3, LogOut, Menu, X, Headphones, Users, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext'; // FIX: Import useChat dari context yang sudah diperbarui
import { cn } from '@/utils/cn';

export type ActivePage = 'chat' | 'history' | 'monitoring' | 'cs-dashboard' | 'manage-users' | 'knowledge-base' | 'chatbot' | 'monthly-report';

interface SidebarNavProps {
  bottomContent?: React.ReactNode;
}

export function SidebarNav({ bottomContent }: SidebarNavProps) {
  const { user, logout } = useAuth();
  const { resetChatSession } = useChat(); // FIX: Destructure fungsi reset dari ChatContext
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const activePage = location.pathname.replace('/', '') || 'chat';

  const handleNavigate = (page: ActivePage) => {
    navigate(`/${page}`);
    setIsOpen(false);
  };

  // FIX: Handler khusus untuk mengarahkan ke Chatbot baru dengan mereset session aktif
  const handleGoToNewChat = (page: ActivePage) => {
    resetChatSession(); // Mengosongkan currentChatId dan currentSessionId
    navigate(`/${page}`, { replace: true });
    setIsOpen(false);
  };

  // Match roles dengan BE: customer | customer_service | admin
  const isAdmin = user?.role === 'admin';
  const isCS = user?.role === 'customer_service';
  const isCustomer = user?.role === 'customer';

  // Display name: full_name atau name
  const displayName = (user as any)?.full_name || user?.name || user?.email || '';

  const roleLabel = isAdmin ? 'Administrator' : isCS ? 'Customer Service' : 'User';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed top-4 left-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-3xl border border-white/20 bg-white/95 text-epson-blue shadow-lg shadow-slate-900/10 transition-colors hover:bg-white lg:hidden"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={cn(
          'flex flex-col fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-gradient-to-b from-epson-blue-sidebar to-[#001f5e] transition-transform duration-300 lg:static lg:translate-x-0 lg:shrink-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="px-6 pt-8 pb-6 shrink-0">
          <div className="flex items-baseline gap-0.5">
            <span className="font-black text-2xl tracking-tight text-white">EPSON</span>
            <span className="text-white/50 text-xs align-top mt-1.5">®</span>
            <span className="font-light text-2xl ml-1.5 text-white">Support</span>
          </div>
          <p className="text-white/50 text-xs mt-1">AI Helpdesk Assistant</p>
        </div>

        {/* Nav — customer */}
        {isCustomer && (
          <nav className="px-4 flex flex-col gap-1 shrink-0">
            {/* FIX: Menggunakan handleGoToNewChat untuk mereset room state */}
            <NavBtn icon={<BotMessageSquare size={18} />} label="Chatbot" active={activePage === 'chat' || activePage === ''} onClick={() => handleGoToNewChat('chat')} />
            <NavBtn icon={<History size={18} />} label="History" active={activePage === 'history'} onClick={() => handleNavigate('history')} />
          </nav>
        )}

        {/* Nav — admin */}
        {isAdmin && (
          <nav className="px-4 flex flex-col gap-1 shrink-0">
            {/* FIX: Menggunakan handleGoToNewChat untuk mereset room state */}
            <NavBtn icon={<BarChart3 size={18} />} label="Monitoring" active={activePage === 'monitoring'} onClick={() => handleNavigate('monitoring')} />
            <NavBtn icon={<BookOpen size={18} />} label="Knowledge Base" active={activePage === 'knowledge-base'} onClick={() => handleNavigate('knowledge-base')} />
            <NavBtn icon={<Users size={18} />} label="Kelola Akun" active={activePage === 'manage-users'} onClick={() => handleNavigate('manage-users')} />
          </nav>
        )}

        {/* Nav — customer_service */}
        {isCS && (
          <nav className="px-4 flex flex-col gap-1 shrink-0">
            <NavBtn icon={<Headphones size={18} />} label="CS Dashboard" active={activePage === 'cs-dashboard'} onClick={() => handleNavigate('cs-dashboard')} />
          </nav>
        )}

        {bottomContent && (
          <div className="flex-1 mt-4 overflow-y-auto pb-4 min-h-0">
            {bottomContent}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 pb-6 mt-auto shrink-0">
          {user && (
            <div className="px-4 py-3 mb-2 bg-white/10 rounded-xl">
              <p className="text-white text-sm font-semibold truncate">{displayName}</p>
              <p className="text-white/50 text-xs truncate">{user.email}</p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1 block">
                {roleLabel}
              </span>
            </div>
          )}
          <button onClick={logout} className="nav-item w-full hover:bg-red-500/20 hover:text-red-300">
            <LogOut size={16} /> Keluar
          </button>
          <p className="text-white/30 text-xs mt-4 px-4">Powered by EPSON AI Technology</p>
        </div>
      </aside>
    </>
  );
}

function NavBtn({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={cn('nav-item w-full text-left', active && 'active')}>
      {icon} {label}
    </button>
  );
}