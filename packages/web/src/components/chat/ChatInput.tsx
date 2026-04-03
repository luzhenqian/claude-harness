'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex items-end gap-2 p-3" style={{ borderTop: '1px solid var(--border)' }}>
      <textarea
        ref={textareaRef} value={input}
        onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
        onKeyDown={handleKeyDown} placeholder="Ask about Claude Code..." disabled={disabled} rows={1}
        className="flex-1 resize-none rounded-lg px-3 py-2 text-sm placeholder:opacity-40 focus:outline-none disabled:opacity-50"
        style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', caretColor: 'var(--accent)' }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
      />
      <button onClick={handleSend} disabled={disabled || !input.trim()}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ background: 'var(--accent)' }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
        Send
      </button>
    </div>
  );
}
