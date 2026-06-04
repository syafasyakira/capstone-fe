import React, { useState, useRef } from 'react';
import { Send, Image, X } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, imageUrl?: string) => void;
  disabled?: boolean;
  quickReplies?: string[];
}

export default function ChatInput({ onSend, disabled, quickReplies = [] }: ChatInputProps) {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim() && !imagePreview) return;
    onSend(text.trim(), imagePreview ?? undefined);
    setText('');
    setImagePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleQuickReply = (q: string) => {
    onSend(q);
  };

  return (
    <div className="border-t border-gray-100 bg-white px-6 py-4">
      {/* Quick replies */}
      {quickReplies.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <span className="text-gray-400 shrink-0 flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </span>
          {quickReplies.map((q) => (
            <button key={q} onClick={() => handleQuickReply(q)} className="quick-reply-chip">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="relative inline-block mb-3">
          <img src={imagePreview} alt="preview" className="h-20 rounded-xl border border-gray-200" />
          <button
            onClick={() => setImagePreview(null)}
            className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-epson-blue transition-colors"
            title="Kirim gambar"
          >
            <Image size={20} />
          </button>
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik pertanyaan anda di sini..."
          disabled={disabled}
          rows={1}
          className="flex-1 min-w-0 bg-gray-100 rounded-2xl px-5 py-3 text-sm outline-none resize-none focus:bg-white focus:ring-2 focus:ring-epson-accent/30 transition-all max-h-32 disabled:opacity-50"
          style={{ lineHeight: '1.5' }}
        />

        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !imagePreview)}
          className="w-11 h-11 bg-epson-blue-mid hover:bg-epson-blue disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all shrink-0"
        >
          <Send size={18} />
        </button>
      </div>

      <p className="text-center text-xs text-gray-300 mt-3">Powered by EPSON AI Technology</p>
    </div>
  );
}
