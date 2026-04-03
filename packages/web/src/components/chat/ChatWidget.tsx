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
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white text-xl hover:scale-105 transition-transform"
          style={{ background: 'linear-gradient(135deg, var(--accent), #d97706)', boxShadow: '0 4px 24px var(--accent-glow)' }}
          aria-label={t(locale, 'chat.openChat')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[480px] h-[600px]">
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
