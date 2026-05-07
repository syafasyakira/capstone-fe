import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BotMessageSquare, History, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

export type ActivePage = 'chat' | 'history' | 'monitoring';

interface SidebarNavProps {
  bottomContent?: React.ReactNode;
}

export function SidebarNav({ bottomContent }: SidebarNavProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const activePage = location.pathname.replace('/', '') || 'chat';

  const handleNavigate = (page: ActivePage) => {
    navigate(`/${page}`);
  };

  return (
    <aside className="sidebar w-72 min-h-screen flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-baseline gap-0.5">
          <span className="font-black text-2xl tracking-tight text-white">EPSON</span>
          <span className="text-white/50 text-xs align-top mt-1.5">®</span>
          <span className="font-light text-2xl ml-1.5 text-white">Support</span>
        </div>
        <p className="text-white/50 text-xs mt-1">AI Helpdesk Assistant</p>
      </div>

      {/* Nav */}
      <nav className="px-4 flex flex-col gap-1">
        <NavBtn
          icon={<BotMessageSquare size={18} />}
          label="Chatbot"
          active={activePage === 'chat' || activePage === ''}
          onClick={() => handleNavigate('chat')}
        />
        <NavBtn
          icon={<History size={18} />}
          label="History"
          active={activePage === 'history'}
          onClick={() => handleNavigate('history')}
        />
        {isAdmin && (
          <NavBtn
            icon={<BarChart3 size={18} />}
            label="Monitoring and Report"
            active={activePage === 'monitoring'}
            onClick={() => handleNavigate('monitoring')}
          />
        )}
      </nav>

      {/* Optional content e.g. FAQ */}
      {bottomContent && (
        <div className="flex-1 mt-4 overflow-y-auto">{bottomContent}</div>
      )}

      {/* Footer */}
      <div className={cn('px-4 pb-6', !bottomContent && 'mt-auto')}>
        <button
          onClick={logout}
          className="nav-item w-full hover:bg-red-500/20 hover:text-red-300"
        >
          <LogOut size={16} /> Keluar
        </button>
        <p className="text-white/30 text-xs mt-4 px-4">Powered by EPSON AI Technology</p>
      </div>
    </aside>
  );
}

function NavBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={cn('nav-item w-full text-left', active && 'active')}>
      {icon} {label}
    </button>
  );
}
