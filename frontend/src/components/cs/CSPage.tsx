import React from 'react';
import { SidebarNav } from '@/components/layout/AppLayout';
import CSDashboard from '@/components/cs/CSDashboard';

export default function CSPage() {
  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <SidebarNav />
      <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
        <CSDashboard />
      </div>
    </div>
  );
}
