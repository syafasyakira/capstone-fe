import React, { useState } from 'react';
import { Copy, Check, BotMessageSquare, Headphones } from 'lucide-react';
import { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
  showResolvedActions?: boolean;
  resolvedState?: 'none' | 'solved' | 'unsolved';
  onMarkSolved?: (solved: boolean) => void;
  csHandlerName?: string | null;
}

export default function MessageBubble({
  message,
  showResolvedActions = false,
  resolvedState = 'none',
  onMarkSolved,
  csHandlerName,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isBot = message.role === 'bot';
  const isCS = message.role === 'cs';
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const time = new Date(message.timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  });

  // --- User bubble ---
  if (isUser) {
    return (
      <div className="flex justify-end items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex flex-col items-end max-w-full sm:max-w-[75%] gap-1">
          {message.imageUrl && (
            <div className="mb-1 rounded-2xl overflow-hidden border border-gray-100 max-w-full sm:max-w-xs">
              <img src={message.imageUrl} alt="attachment" className="w-full h-auto" />
            </div>
          )}
          <div
            className="text-white px-[17px] py-[13px] rounded-[18px] rounded-tr-[4px]"
            style={{ background: 'linear-gradient(to bottom right, var(--epson-blue-light), var(--epson-blue-mid))' }}
          >
            <p className="text-[14px] leading-[1.55] break-words">{message.content}</p>
          </div>
          <span className="text-[10.5px] text-gray-400 px-1 font-normal">{time}</span>
        </div>
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mb-6">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        </div>
      </div>
    );
  }

  // --- Bot / CS bubble ---
  const avatarStyle = isCS
    ? { backgroundColor: 'var(--epson-blue-mid)' }
    : { backgroundColor: 'var(--epson-blue-card)', borderColor: 'var(--epson-blue-light)', opacity: 0.8 };

  return (
    <div className="flex flex-col mb-1 animate-in fade-in slide-in-from-bottom-2 max-w-full sm:max-w-[80%]">
      <div className="flex gap-[10px] items-end group">
        {/* Avatar */}
        <div
          className={`w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0 mb-6 ${isBot ? 'border' : ''}`}
          style={avatarStyle}
        >
          {isCS
            ? <Headphones size={18} className="text-white" />
            : <BotMessageSquare size={18} style={{ color: 'var(--epson-blue)' }} />
          }
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          {/* Nama CS handler */}
          {isCS && csHandlerName && (
            <span className="text-[11px] font-semibold px-1" style={{ color: 'var(--epson-blue-mid)' }}>
              {csHandlerName}
            </span>
          )}
          <div className="relative bg-white border border-gray-200 px-[18px] py-[14px] rounded-[18px] rounded-tl-[4px] w-full">
            <div className="whitespace-pre-line text-[14px] leading-[1.6] text-gray-800 break-words">
              {message.content}
            </div>
            <button
              onClick={handleCopy}
              className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-gray-100 text-gray-400"
              title="Salin pesan"
            >
              {copied
                ? <span className="flex items-center gap-1 text-[10.5px] font-medium" style={{ color: 'var(--epson-blue-mid)' }}><Check size={13} /> Tersalin!</span>
                : <Copy size={13} />
              }
            </button>
          </div>
          <span className="text-[10.5px] text-gray-400 px-1 font-normal">{time}</span>
        </div>
      </div>

      {/* Card tombol Terselesaikan / Tidak terselesaikan */}
      {showResolvedActions && isBot && (
        <div className="ml-[44px] mt-1">
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 inline-flex gap-3 animate-in fade-in slide-in-from-bottom-2">
            <button
              onClick={() => resolvedState === 'none' && onMarkSolved?.(true)}
              disabled={resolvedState !== 'none'}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                resolvedState === 'none'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : resolvedState === 'solved'
                  ? 'bg-green-500 text-white opacity-60 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Terselesaikan
            </button>
            <button
              onClick={() => resolvedState === 'none' && onMarkSolved?.(false)}
              disabled={resolvedState !== 'none'}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                resolvedState === 'none'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : resolvedState === 'unsolved'
                  ? 'bg-red-500 text-white opacity-60 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Tidak terselesaikan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
