import React from 'react';
import { BotMessageSquare } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 fade-in-up">
      <div className="w-9 h-9 rounded-xl bg-epson-blue-mid flex items-center justify-center shrink-0">
        <BotMessageSquare size={18} className="text-white" />
      </div>
      <div className="chat-bubble-bot flex items-center gap-1 py-4 px-5">
        <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
        <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
        <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
      </div>
    </div>
  );
}
