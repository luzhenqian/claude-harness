'use client';

import { useState, useCallback } from 'react';
import { ChatPanel } from './ChatPanel';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/ui-translations';

interface Props { articleSlug?: string; articleContent?: string; }

export interface ChatWidgetHandle {
  open: (message?: string, context?: { selectedText?: string; articleSlug?: string; articleContent?: string }) => void;
}

let widgetHandle: ChatWidgetHandle | null = null;
export function getChatWidgetHandle() { return widgetHandle; }

export function ChatWidget({ articleSlug, articleContent }: Props) {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<{ content: string; context?: any } | null>(null);

  const open = useCallback((message?: string, context?: any) => {
    setIsOpen(true);
    if (message) setPendingMessage({ content: message, context });
  }, []);

  widgetHandle = { open };

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 50,
            width: 56,
            height: 56,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
            border: '1px solid rgba(245,158,11,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(245,158,11,0.1)',
            color: 'var(--accent)',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            animation: 'chat-bubble-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          aria-label={t(locale, 'chat.openChat')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 50,
          width: 480,
          height: 600,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
          animation: 'chat-window-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <ChatPanel
            onClose={() => { setIsOpen(false); setPendingMessage(null); }}
            articleSlug={articleSlug} articleContent={articleContent}
            pendingMessage={pendingMessage}
            onPendingConsumed={() => setPendingMessage(null)}
          />
        </div>
      )}
    </>
  );
}
