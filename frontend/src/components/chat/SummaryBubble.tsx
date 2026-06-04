import React from 'react';
import { FileText, Download } from 'lucide-react';
import { ChatMessage } from '@/types';
import { downloadChatSummaryPDF } from '@/utils/pdf';

interface SummaryBubbleProps {
  content: string;
  messages: ChatMessage[];
  sessionTitle: string;
}

export default function SummaryBubble({ content, messages, sessionTitle }: SummaryBubbleProps) {
  const handleDownload = () => {
    downloadChatSummaryPDF(messages, sessionTitle);
  };

  return (
    <div className="flex flex-col gap-3 fade-in-up sm:flex-row sm:items-start">
      <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0 mt-1">
        <FileText size={18} className="text-white" />
      </div>
      <div className="w-full sm:max-w-[70%]">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tl-sm px-5 py-4">
          <p className="text-xs font-semibold text-indigo-500 mb-2 uppercase tracking-wide">Ringkasan Percakapan</p>
          <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed break-words">{content}</div>
          <button
            onClick={handleDownload}
            className="mt-4 flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all"
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
