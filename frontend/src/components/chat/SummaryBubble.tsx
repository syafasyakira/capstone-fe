import React from 'react';
import { FileText, Download } from 'lucide-react';
import { ChatMessage } from '@/types';
import { downloadChatSummaryPDF } from '@/utils/pdf';

interface SummaryBubbleProps {
  content: string;
  messages: ChatMessage[];
  sessionTitle: string;
  isCSHandover?: boolean; // true = ringkasan dari CS setelah sesi selesai
}

// Render markdown: ## heading, **bold**, *italic*, `code`, - list, 1. list
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const key = `s-${i}`;

    if (/^###\s/.test(line)) {
      result.push(<p key={key} className="font-bold text-[12.5px] text-indigo-900 mt-3 mb-0.5">{inlineMarkdown(line.replace(/^###\s/, ''))}</p>);
      return;
    }
    if (/^##\s/.test(line)) {
      result.push(<p key={key} className="font-bold text-[13px] text-indigo-900 mt-4 mb-1 border-b border-indigo-100 pb-0.5">{inlineMarkdown(line.replace(/^##\s/, ''))}</p>);
      return;
    }
    if (/^#\s/.test(line)) {
      result.push(<p key={key} className="font-bold text-[13.5px] text-indigo-900 mt-4 mb-1">{inlineMarkdown(line.replace(/^#\s/, ''))}</p>);
      return;
    }
    if (/^[-*]\s/.test(line)) {
      result.push(
        <div key={key} className="flex gap-2 items-start my-0.5">
          <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          <span className="text-[13px] leading-[1.6] text-gray-700">{inlineMarkdown(line.replace(/^[-*]\s/, ''))}</span>
        </div>
      );
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      result.push(
        <div key={key} className="flex gap-2 items-start my-0.5">
          <span className="text-[12px] font-semibold text-indigo-400 shrink-0 min-w-[16px]">{num}.</span>
          <span className="text-[13px] leading-[1.6] text-gray-700">{inlineMarkdown(line.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
      return;
    }
    if (line.trim() === '') {
      result.push(<div key={key} className="h-1.5" />);
      return;
    }
    result.push(<p key={key} className="text-[13px] leading-[1.6] text-gray-700">{inlineMarkdown(line)}</p>);
  });

  return result;
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2] !== undefined) parts.push(<strong key={match.index} className="font-semibold text-gray-900">{match[2]}</strong>);
    else if (match[3] !== undefined) parts.push(<em key={match.index}>{match[3]}</em>);
    else if (match[4] !== undefined) parts.push(<code key={match.index} className="bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded text-[11.5px] font-mono">{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export default function SummaryBubble({ content, messages, sessionTitle, isCSHandover = false }: SummaryBubbleProps) {
  const handleDownload = () => {
    downloadChatSummaryPDF(messages, sessionTitle);
  };

  return (
    <div className="flex flex-col gap-3 fade-in-up sm:flex-row sm:items-start my-2">
      <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0 mt-1">
        <FileText size={18} className="text-white" />
      </div>
      <div className="w-full sm:max-w-[85%]">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tl-sm px-5 py-4">
          <p className="text-xs font-semibold text-indigo-500 mb-3 uppercase tracking-wide flex items-center gap-1.5">
            <FileText size={12} />
            {isCSHandover ? 'Ringkasan Penanganan CS' : 'Ringkasan Percakapan'}
          </p>
          <div className="space-y-0.5">
            {renderMarkdown(content)}
          </div>
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