import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import LoginPage from '@/components/auth/LoginPage';
import RegisterPage from '@/components/auth/RegisterPage';
import ChatPage from '@/components/chat/ChatPage';
import HistoryPage from '@/components/history/HistoryPage';
import MonitoringPage from '@/components/dashboard/MonitoringPage';

// Wrapper agar bisa pakai useNavigate di dalam provider
function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Belum login → tampilkan auth
  if (!user) {
    return authView === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  // Sudah login → routing halaman utama
  return (
    <Routes>
      <Route path="/" element={<ChatPage onNavigate={(p) => navigate(`/${p}`)} />} />
      <Route path="/chat" element={<ChatPage onNavigate={(p) => navigate(`/${p}`)} />} />
      <Route path="/history" element={<HistoryPage onNavigate={(p) => navigate(`/${p}`)} />} />
      <Route
        path="/monitoring"
        element={
          user.role === 'admin' ? (
            <MonitoringPage onNavigate={(p) => navigate(`/${p}`)} />
          ) : (
            <Navigate to="/chat" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppRoutes />
      </ChatProvider>
    </AuthProvider>
  );
}
