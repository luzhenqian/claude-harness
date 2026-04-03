'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import type { ChatMessage } from '@/hooks/useChat';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/ui-translations';

interface Props {
  messages: ChatMessage[];
  onEditMessage?: (id: string, newContent: string) => void;
}

export function ChatMessages({ messages, onEditMessage }: Props) {
  const locale = useLocale();
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div style={{ textAlign: 'center' }}>
          {/* Terminal icon in rounded square */}
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
            border: '1px solid rgba(245,158,11,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          <h3 style={{
            fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text)',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {locale === 'zh' ? '\u5173\u4e8e Claude Code' : locale === 'ja' ? 'Claude Code \u306b\u3064\u3044\u3066' : 'About Claude Code'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {t(locale, 'chat.emptyState')}
          </p>
        </div>
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
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
