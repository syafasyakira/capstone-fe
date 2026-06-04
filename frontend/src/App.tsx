import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import LoginPage from '@/components/auth/LoginPage';
import RegisterPage from '@/components/auth/RegisterPage';
import ChatPage from '@/components/chat/ChatPage';
import HistoryPage from '@/components/history/HistoryPage';
import MonitoringPage from '@/components/dashboard/MonitoringPage';
import CSPage from '@/components/cs/CSPage';
import ManageUsersPage from '@/components/admin/ManageUsersPage';
import KnowledgeBasePage from '@/components/admin/KnowledgeBasePage';

function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  if (!user) {
    return authView === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  const isAdmin = user.role === 'admin';
  const isCS = user.role === 'cs';
  const isUser = user.role === 'user';

  return (
    <Routes>
      {/* User routes */}
      {isUser && (
        <>
          <Route path="/" element={<ChatPage onNavigate={p => navigate(`/${p}`)} />} />
          <Route path="/chat" element={<ChatPage onNavigate={p => navigate(`/${p}`)} />} />
          <Route path="/history" element={<HistoryPage onNavigate={p => navigate(`/${p}`)} />} />
        </>
      )}

      {/* Admin routes */}
      {isAdmin && (
        <>
          <Route path="/" element={<Navigate to="/monitoring" replace />} />
          <Route path="/monitoring" element={<MonitoringPage onNavigate={p => navigate(`/${p}`)} />} />
          <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="/manage-users" element={<ManageUsersPage />} />
        </>
      )}

      {/* CS routes */}
      {isCS && (
        <>
          <Route path="/" element={<Navigate to="/cs-dashboard" replace />} />
          <Route path="/cs-dashboard" element={<CSPage />} />
        </>
      )}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
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
