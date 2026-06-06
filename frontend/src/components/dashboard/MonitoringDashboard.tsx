import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock, Download, TrendingUp, TrendingDown, BarChart3, Calendar, Loader2, BotMessageSquare } from 'lucide-react';
import { getMonitoringData, getTopIssues } from '@/services/api';
import { downloadMonthlyReportPDF } from '@/utils/pdf';

const YEARS = [2024, 2025, 2026];
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

interface MonitoringStats {
  total: number; solved: number; pending: number;
  totalChange: string; solvedChange: string; pendingChange: string;
  isTotalUp: boolean; isSolvedUp: boolean; isPendingUp: boolean;
}

export default function MonitoringDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<MonitoringStats>({
    total: 0, solved: 0, pending: 0,
    totalChange: '0%', solvedChange: '0%', pendingChange: '0%',
    isTotalUp: true, isSolvedUp: true, isPendingUp: true,
  });
  const [topIssues, setTopIssues] = useState<string[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        // Fix 5: kirim month dan year ke BE
        const data = await getMonitoringData(selectedMonth, selectedYear);
        // BE /admin/monitoring returns: { chats: { total, solved, ... } }
        const chats = data.chats || {};
        const total = chats.total || data.total_chats || 0;
        const solved = chats.solved || data.solved_chats || 0;
        const pending = (chats.waiting_cs || 0) + (chats.with_cs || 0) + (data.pending_chats || 0);

        setStats({
          total,
          solved,
          pending,
          totalChange: data.total_change || '—',
          solvedChange: data.solved_change || '—',
          pendingChange: data.pending_change || '—',
          isTotalUp: !(data.total_change || '').startsWith('-'),
          isSolvedUp: !(data.solved_change || '').startsWith('-'),
          isPendingUp: !(data.pending_change || '').startsWith('-'),
        });
      } catch (err) {
        console.error('Failed to load monitoring data:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchIssues = async () => {
      setLoadingIssues(true);
      try {
        const issues = await getTopIssues(selectedMonth, selectedYear);
        setTopIssues(issues);
      } catch (err) {
        console.error('Failed to load top issues:', err);
        setTopIssues([]);
      } finally {
        setLoadingIssues(false);
      }
    };
    fetchIssues();
  }, [selectedMonth, selectedYear]);

  const handleDownload = async () => {
    const monthLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;
    await downloadMonthlyReportPDF(monthLabel, {
      totalIssues: stats.total,
      solved: stats.solved,
      pending: stats.pending,
      topIssues,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="pl-12 sm:pl-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-600" /> Dashboard Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            Data real-time bulan <strong>{MONTHS[selectedMonth]} {selectedYear}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 sm:p-3 rounded-xl border border-gray-100 shadow-sm mt-2 lg:mt-0">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="text-xs sm:text-sm font-bold text-gray-600 outline-none bg-transparent border-r pr-2 cursor-pointer">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="text-xs sm:text-sm font-bold text-gray-600 outline-none bg-transparent pr-2 cursor-pointer">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Calendar size={14} className="text-gray-400" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-5 mb-8">
        <StatCard label="Total Chat" value={stats.total} change={stats.totalChange} up={stats.isTotalUp}
          icon={<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />} bg="bg-blue-50" ring="ring-blue-100" loading={loadingStats} />
        <StatCard label="Solved" value={stats.solved} change={stats.solvedChange} up={stats.isSolvedUp}
          icon={<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />} bg="bg-green-50" ring="ring-green-100" loading={loadingStats} />
        <StatCard label="Pending" value={stats.pending} change={stats.pendingChange} up={stats.isPendingUp}
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />} bg="bg-orange-50" ring="ring-orange-100" loading={loadingStats} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Top Issues — dari AI Gemini */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-bold text-gray-700 mb-1 text-center flex items-center justify-center gap-2">
            Top Masalah
            <span className="text-[10px] font-normal bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full flex items-center gap-1">
              <BotMessageSquare size={10} /> AI
            </span>
          </h2>
          <p className="text-[10px] text-gray-400 text-center mb-4">Dianalisis dari percakapan bulan ini</p>

          {loadingIssues ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs">Menganalisis...</span>
            </div>
          ) : topIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-300">
              <BarChart3 size={28} className="mb-2" />
              <p className="text-xs">Belum ada data bulan ini</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {topIssues.map((issue, i) => (
                <div key={i} className="flex items-center gap-3 sm:gap-4 py-2.5 sm:py-3">
                  <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-700">{issue}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Laporan Download */}
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
              <button onClick={handleDownload}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shrink-0">
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
  label: string; value: number; change: string; up: boolean;
  icon: React.ReactNode; bg: string; ring: string; loading?: boolean;
}

function StatCard({ label, value, change, up, icon, bg, ring, loading }: StatCardProps) {
  return (
    <div className={`flex flex-col gap-2 sm:gap-3 p-3 sm:p-5 rounded-2xl bg-white ring-1 ${ring} shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] sm:text-sm text-gray-500 font-medium truncate pr-1">{label}</span>
        <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
      </div>
      {loading
        ? <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
        : <p className="text-xl sm:text-4xl font-bold text-gray-800">{value}</p>
      }
      <div className="flex items-center gap-1 text-[9px] sm:text-xs font-medium mt-auto">
        {up ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-red-400" />}
        <span className={up ? 'text-green-500' : 'text-red-400'}>{change}</span>
        <span className="text-gray-400 hidden sm:inline">vs bulan lalu</span>
      </div>
    </div>
  );
}