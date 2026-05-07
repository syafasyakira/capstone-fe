import React from 'react';
import { SidebarNav } from '@/components/layout/AppLayout';
import HistoryView from '@/components/history/HistoryView';
import { useNavigate } from 'react-router-dom';

export default function HistoryPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
        <HistoryView onSelectSession={() => navigate('/chat')} />
      </div>
    </div>
  );
}
