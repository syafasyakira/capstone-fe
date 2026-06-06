import React, { useState, useEffect } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Download,
  TrendingUp, TrendingDown, BarChart3, Calendar
} from 'lucide-react';
import { getMonitoringData } from '@/services/api';
import { downloadMonthlyReportPDF } from '@/utils/pdf';

const TOP_ISSUES = [
  'Tinta tidak terbaca',
  'Printer tidak jalan',
  'Kertas tersangkut',
  'Koneksi wifi',
  'Kualitas print',
];

const YEARS = [2024, 2025, 2026];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface MonitoringStats {
  total: number;
  solved: number;
  pending: number;
  totalChange: string;
  solvedChange: string;
  pendingChange: string;
  isTotalUp: boolean;
  isSolvedUp: boolean;
  isPendingUp: boolean;
}

export default function MonitoringDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<MonitoringStats>({
    total: 0, solved: 0, pending: 0,
    totalChange: '0%', solvedChange: '0%', pendingChange: '0%',
    isTotalUp: true, isSolvedUp: true, isPendingUp: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMonitoringData();
        setStats({
          total: data.total_chats || 0,
          solved: data.solved_chats || 0,
          pending: data.pending_chats || 0,
          totalChange: data.total_change || '0%',
          solvedChange: data.solved_change || '0%',
          pendingChange: data.pending_change || '0%',
          isTotalUp: (data.total_change || '0%').startsWith('+') || (data.total_change || '0%') === '0%',
          isSolvedUp: (data.solved_change || '0%').startsWith('+') || (data.solved_change || '0%') === '0%',
          isPendingUp: (data.pending_change || '0%').startsWith('+') || (data.pending_change || '0%') === '0%',
        });
      } catch (err) {
        console.error('Failed to load monitoring data:', err);
      }
    };
    fetchData();
  }, [selectedMonth, selectedYear]);

  const handleDownload = async () => {
    const monthLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;
    await downloadMonthlyReportPDF(monthLabel, {
      totalIssues: stats.total,
      solved: stats.solved,
      pending: stats.pending,
      topIssues: TOP_ISSUES,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="pl-12 sm:pl-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="flex items-center gap-2">
              <BarChart3 size={24} className="text-blue-600" />
              Dashboard Monitoring
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            Data real-time bulan <strong>{MONTHS[selectedMonth]} {selectedYear}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 sm:p-3 rounded-xl border border-gray-100 shadow-sm mt-2 lg:mt-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="text-xs sm:text-sm font-bold text-gray-600 outline-none bg-transparent border-r pr-2 cursor-pointer"
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="text-xs sm:text-sm font-bold text-gray-600 outline-none bg-transparent pr-2 cursor-pointer"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Calendar size={14} className="text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-5 mb-8">
        <StatCard
          label="Total"
          value={stats.total}
          change={stats.totalChange}
          up={stats.isTotalUp}
          icon={<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
          bg="bg-blue-50"
          ring="ring-blue-100"
        />
        <StatCard
          label="Solved"
          value={stats.solved}
          change={stats.solvedChange}
          up={stats.isSolvedUp}
          icon={<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
          bg="bg-green-50"
          ring="ring-green-100"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          change={stats.pendingChange}
          up={stats.isPendingUp}
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />}
          bg="bg-orange-50"
          ring="ring-orange-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 grid-cols-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-bold text-gray-700 mb-4 sm:mb-5 text-center">Top Masalah</h2>
          <div className="flex flex-col divide-y divide-gray-50">
            {TOP_ISSUES.map((issue, i) => (
              <div key={issue} className="flex items-center gap-3 sm:gap-4 py-2.5 sm:py-3">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs sm:text-sm text-gray-700">{issue}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-bold text-gray-700 mb-4 sm:mb-5 text-center">Laporan Tersedia</h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-blue-50 hover:bg-blue-100 rounded-xl px-3 sm:px-4 py-3 transition-colors">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 size={14} className="text-blue-600 sm:w-4 sm:h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">
                  Laporan {MONTHS[selectedMonth]} {selectedYear}
                </span>
              </div>
              <button
                onClick={handleDownload}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shrink-0"
                title="Download Laporan PDF"
              >
                <Download size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
            <p className="text-[9px] sm:text-[10px] text-gray-400 mt-2 px-1 italic">
              * Data laporan diperbarui otomatis berdasarkan filter di atas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  change: string;
  up: boolean;
  icon: React.ReactNode;
  bg: string;
  ring: string;
}

function StatCard({ label, value, change, up, icon, bg, ring }: StatCardProps) {
  return (
    <div className={`flex flex-col gap-2 sm:gap-3 p-3 sm:p-5 rounded-2xl bg-white ring-1 ${ring} shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] sm:text-sm text-gray-500 font-medium truncate pr-1">{label}</span>
        <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
      <p className="text-xl sm:text-4xl font-bold text-gray-800">{value}</p>

      <div className="flex items-center gap-1 text-[9px] sm:text-xs font-medium mt-auto">
        {up ? (
          <TrendingUp size={12} className="text-green-500 sm:w-3 sm:h-3" />
        ) : (
          <TrendingDown size={12} className="text-red-400 sm:w-3 sm:h-3" />
        )}
        <span className={up ? 'text-green-500' : 'text-red-400'}>{change}</span>
        <span className="text-gray-400 hidden sm:inline">vs last mo</span>
      </div>
    </div>
  );
}