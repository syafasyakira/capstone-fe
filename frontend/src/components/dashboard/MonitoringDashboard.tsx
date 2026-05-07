import React, { useState, useMemo } from 'react';
import { 
  AlertCircle, CheckCircle2, Clock, Download, 
  TrendingUp, TrendingDown, BarChart3, Calendar 
} from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { downloadMonthlyReportPDF } from '@/utils/pdf';
import { cn } from '@/utils/cn';

// --- CONSTANTS ---
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

export default function MonitoringDashboard() {
  const { sessions } = useChat();

  // State untuk Filter Manual (Permintaan: Bisa milih bulan dan tahun)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 1. Logika Hitung Berdasarkan Data Masuk (Permintaan: Hitung dari database/context)
  const stats = useMemo(() => {
    const filtered = sessions.filter(s => {
      const date = new Date(s.timestamp);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });

    const total = filtered.length;
    const solved = filtered.filter(s => s.status === 'solved').length;
    const pending = total - solved;

    return {
      total,
      solved,
      pending,
      // Simulasi change rate
      totalChange: '+12%',
      solvedChange: '-12%',
      pendingChange: '+12%',
    };
  }, [sessions, selectedMonth, selectedYear]);

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
    <div className="flex-1 overflow-y-auto px-8 py-8">
      {/* Header & Filter Area */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 size={26} className="text-epson-blue" /> Dashboard Monitoring
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Data real-time bulan <strong>{MONTHS[selectedMonth]} {selectedYear}</strong>
          </p>
        </div>

        {/* Filter Dropdown (Permintaan: Bisa milih dari bulan & tahun berapa) */}
        <div className="flex gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="text-xs font-bold text-gray-600 outline-none bg-transparent border-r pr-2"
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="text-xs font-bold text-gray-600 outline-none bg-transparent pr-2"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Calendar size={14} className="text-gray-400 self-center ml-1" />
        </div>
      </div>

      {/* Stat cards (Design Awal) */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <StatCard
          label="Total Issues"
          value={stats.total}
          change={stats.totalChange}
          up
          icon={<AlertCircle size={22} className="text-epson-blue" />}
          bg="bg-blue-50"
          ring="ring-blue-100"
        />
        <StatCard
          label="Solved"
          value={stats.solved}
          change={stats.solvedChange}
          up={false}
          icon={<CheckCircle2 size={22} className="text-green-600" />}
          bg="bg-green-50"
          ring="ring-green-100"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          change={stats.pendingChange}
          up
          icon={<Clock size={22} className="text-orange-500" />}
          bg="bg-orange-50"
          ring="ring-orange-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Top Issues (Design Awal) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h2 className="text-base font-bold text-gray-700 mb-5 text-center">Top masalah</h2>
          <div className="flex flex-col divide-y divide-gray-50">
            {TOP_ISSUES.map((issue, i) => (
              <div key={issue} className="flex items-center gap-4 py-3">
                <span className="w-7 h-7 rounded-lg bg-epson-blue-card text-epson-blue font-bold text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700">{issue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Laporan Bulanan (Design Awal dengan fungsi download dinamis) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h2 className="text-base font-bold text-gray-700 mb-5 text-center">Laporan Tersedia</h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-epson-blue-card hover:bg-blue-100 rounded-xl px-4 py-3 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-epson-blue-mid/10 flex items-center justify-center">
                  <BarChart3 size={16} className="text-epson-blue" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Laporan {MONTHS[selectedMonth]} {selectedYear}
                </span>
              </div>
              <button
                onClick={handleDownload}
                className="w-8 h-8 rounded-lg bg-epson-blue-mid hover:bg-epson-blue text-white flex items-center justify-center transition-colors"
                title="Download Laporan PDF"
              >
                <Download size={15} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 px-1 italic">
              * Data laporan diperbarui otomatis berdasarkan filter bulan/tahun di atas.
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
    <div className={`stat-card flex flex-col gap-3 ring-1 ${ring}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-4xl font-bold text-gray-800">{value}</p>
      <div className="flex items-center gap-1 text-xs font-medium">
        {up ? (
          <TrendingUp size={14} className="text-green-500" />
        ) : (
          <TrendingDown size={14} className="text-red-400" />
        )}
        <span className={up ? 'text-green-500' : 'text-red-400'}>{change}</span>
        <span className="text-gray-400">from last month</span>
      </div>
    </div>
  );
}