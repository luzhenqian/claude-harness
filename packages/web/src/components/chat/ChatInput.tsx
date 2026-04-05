'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/ui-translations';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const locale = useLocale();
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

  const hasInput = input.trim().length > 0;

  return (
    <div style={{ padding: '16px', borderTop: '1px solid #1a1a22' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          ref={textareaRef} value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
          }}
          onKeyDown={handleKeyDown}
          placeholder={t(locale, 'chat.placeholder')}
          disabled={disabled} rows={1}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: 16,
            lineHeight: 1.6,
            fontFamily: "'Noto Sans SC', sans-serif",
            resize: 'none',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            minHeight: 44,
            maxHeight: 160,
            overflow: 'hidden',
            opacity: disabled ? 0.5 : 1,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(245,158,11,0.3)';
            e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.06)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.boxShadow = 'none';
          }}
        />
        <button onClick={handleSend} disabled={disabled || !hasInput}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: 'none',
            background: hasInput && !disabled
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'rgba(255,255,255,0.04)',
            color: hasInput && !disabled ? '#09090b' : 'var(--text-muted)',
            cursor: hasInput && !disabled ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
      <div style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 8,
        textAlign: 'center',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        Enter {t(locale, 'chat.send')} · Shift + Enter {locale === 'zh' ? '换行' : locale === 'ja' ? '改行' : 'new line'}
      </div>
    </div>
  );
}
