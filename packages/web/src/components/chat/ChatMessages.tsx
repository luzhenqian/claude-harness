'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import type { ChatMessage } from '@/hooks/useChat';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/ui-translations';

interface Props {
  messages: ChatMessage[];
  onEditMessage?: (id: string, newContent: string) => void;
  onSend?: (content: string) => void;
}

export function ChatMessages({ messages, onEditMessage, onSend }: Props) {
  const locale = useLocale();
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (messages.length === 0) {
    const suggestions = [t(locale, 'chat.quickQ1'), t(locale, 'chat.quickQ2'), t(locale, 'chat.quickQ3')];
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
          border: '1px solid rgba(245,158,11,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            {t(locale, 'chat.askAbout')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300 }}>
            {t(locale, 'chat.emptyState')}
          </div>
        </div>
        {onSend && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
            {suggestions.map((s) => (
              <button key={s} onClick={() => onSend(s)}
                style={{
                  padding: '7px 14px', borderRadius: 100,
                  border: '1px solid rgba(245,158,11,0.2)',
                  background: 'rgba(245,158,11,0.05)',
                  color: 'var(--accent)', fontSize: 12.5, cursor: 'pointer',
                  transition: 'all 0.2s', fontFamily: "'Noto Sans SC', sans-serif",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.35)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.05)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.2)'; }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((msg) => (
        <ChatMessageComponent
          key={msg.id} id={msg.id} role={msg.role} content={msg.content}
          isStreaming={msg.isStreaming}
          onEdit={msg.role === 'user' ? onEditMessage : undefined}
          thinkingSteps={msg.thinkingSteps}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
