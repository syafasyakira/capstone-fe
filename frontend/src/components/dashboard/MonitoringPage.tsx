import React from 'react';
import { SidebarNav } from '@/components/layout/AppLayout';
import MonitoringDashboard from '@/components/dashboard/MonitoringDashboard';

export default function MonitoringPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
        <MonitoringDashboard />
      </div>
    </div>
  );
}
