import React, { useState } from 'react';
import { HelpCircle, Printer, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQPanelProps {
  onSelectQuestion: (q: string) => void;
}

const FAQ_CATEGORIES = [
  {
    icon: Printer,
    title: 'Masalah Terkait Printer',
    questions: [
      'Printer tidak dapat mencetak',
      'Hasil cetakan bergaris atau buram',
      'Kertas macet di printer',
      'Printer tidak terdeteksi di komputer',
      'Cara membersihkan head printer',
      'Printer mengeluarkan suara aneh',
    ],
  },
  {
    icon: HelpCircle,
    title: 'Tinta & Isi Ulang',
    questions: [
      'Cara mengisi tinta printer',
      'Tinta tidak keluar saat cetak',
      'Estimasi tinta habis tidak akurat',
      'Warna cetakan tidak sesuai',
    ],
  },
];

export default function FAQPanel({ onSelectQuestion }: FAQPanelProps) {
  const [openCat, setOpenCat] = useState(0);
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle size={16} className="text-white/60" />
        <div>
          <p className="text-white font-semibold text-sm">Frequently Asked Question</p>
          <p className="text-white/50 text-xs">Pilih pertanyaan di bawah untuk mendapatkan bantuan cepat</p>
        </div>
      </div>

      {FAQ_CATEGORIES.map((cat, ci) => {
        const Icon = cat.icon;
        const isOpen = openCat === ci;
        const shown = showAll ? cat.questions : cat.questions.slice(0, 4);
        return (
          <div key={ci} className="bg-white/10 rounded-xl mb-2 overflow-hidden">
            <button
              onClick={() => setOpenCat(isOpen ? -1 : ci)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <Icon size={16} className="text-white/80 shrink-0" />
              <span className="text-white font-semibold text-sm flex-1">{cat.title}</span>
              {isOpen ? <ChevronUp size={14} className="text-white/50" /> : <ChevronDown size={14} className="text-white/50" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-3 flex flex-col gap-1">
                {shown.map((q) => (
                  <button
                    key={q}
                    onClick={() => onSelectQuestion(q)}
                    className="text-left text-white/80 hover:text-white hover:bg-white/10 text-xs px-3 py-2 rounded-lg transition-all duration-150"
                  >
                    {q}
                  </button>
                ))}
                {cat.questions.length > 4 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-white/50 hover:text-white/80 text-xs mt-1 flex items-center gap-1"
                  >
                    {showAll ? 'Tampilkan Lebih Sedikit' : `Tampilkan Lebih Banyak (${cat.questions.length - 4})`}
                    <ChevronDown size={12} className={showAll ? 'rotate-180' : ''} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
