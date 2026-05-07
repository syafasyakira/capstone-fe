import React, { useState } from 'react';
import { Copy, Check, BotMessageSquare } from 'lucide-react';
import { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy?: (text: string) => void;
}

export default function MessageBubble({ message, onCopy }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isBot = message.role === 'bot';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    onCopy?.(message.content);
    setTimeout(() => setCopied(false), 2000);
  };

  const time = new Date(message.timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!isBot) {
    return (
      <div className="flex justify-end mb-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex flex-col items-end max-w-[82%] gap-1">
          {message.imageUrl && (
            <div className="mb-1 rounded-2xl overflow-hidden border border-gray-100 max-w-xs">
              <img src={message.imageUrl} alt="attachment" className="w-full h-auto" />
            </div>
          )}

          <div 
            className="text-white px-[17px] py-[13px] rounded-[18px] rounded-tr-[4px]"
            style={{ 
              background: `linear-gradient(to bottom right, var(--epson-blue-light), var(--epson-blue-mid))` 
            }}
          >
            <p className="text-[14px] leading-[1.55]">{message.content}</p>
          </div>
          <span className="text-[10.5px] text-gray-400 px-1 mt-1 font-normal">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-[10px] mb-4 animate-in fade-in slide-in-from-bottom-2 group max-w-[82%] items-end">
      <div 
        className="w-[34px] h-[34px] rounded-[10px] border flex items-center justify-center shrink-0 mb-6"
        style={{ backgroundColor: 'var(--epson-blue-card)', borderColor: 'var(--epson-blue-light)', opacity: 0.8
        }}
      >
        <BotMessageSquare size={18} style={{ color: 'var(--epson-blue)' }} />
      </div>
      
      <div className="flex flex-col items-start gap-1">
        <div className="relative bg-white border border-gray-200 px-[18px] py-[14px] rounded-[18px] rounded-tl-[4px]">
          <div className="whitespace-pre-line text-[14px] leading-[1.6] text-gray-800">
            {message.content}
          </div>
          
          <button
            onClick={handleCopy}
            className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center gap-1"
            title="Salin pesan"
          >
            {copied ? (
              <span className="flex items-center gap-1 text-[10.5px] font-medium" style={{ color: 'var(--epson-blue-mid)' }}>
                <Check size={13} /> Tersalin!
              </span>
            ) : (
              <Copy size={13} />
            )}
          </button>
        </div>
        <span className="text-[10.5px] text-gray-400 px-1 mt-1 font-normal">{time}</span>
      </div>
    </div>
  );
}