import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface PostAnswerActionsProps {
  onMarkSolved: (solved: boolean) => void;
}

export default function PostAnswerActions({ onMarkSolved }: PostAnswerActionsProps) {
  const [resolved, setResolved] = useState<boolean | null>(null);

  const handleSolved = (solved: boolean) => {
    setResolved(solved);
    onMarkSolved(solved);
  };

  if (resolved !== null) {
    return (
      <div className="flex justify-center">
        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-500 shadow-card">
          {resolved ? (
            <span className="flex items-center gap-2 text-green-600">
              <CheckCircle size={16} /> Pertanyaan ditandai sebagai <strong>Terselesaikan</strong>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-orange-500">
              <XCircle size={16} /> Pertanyaan ditandai sebagai <strong>Belum Terselesaikan</strong>
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center fade-in-up">
      <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-card max-w-md w-full">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">Apakah masalah Anda sudah terselesaikan?</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => handleSolved(true)}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              <CheckCircle size={15} /> Terselesaikan
            </button>
            <button
              onClick={() => handleSolved(false)}
              className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              <XCircle size={15} /> Belum Terselesaikan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}