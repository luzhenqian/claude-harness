'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ChatPanel } from './ChatPanel';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/ui-translations';

interface Props { articleSlug?: string; articleContent?: string; }

export interface ChatWidgetHandle {
  open: (message?: string, context?: { selectedText?: string; articleSlug?: string; articleContent?: string; newConversation?: boolean }) => void;
}

let widgetHandle: ChatWidgetHandle | null = null;
export function getChatWidgetHandle() { return widgetHandle; }

export function ChatWidget({ articleSlug, articleContent }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const isChatPage = pathname.split('/').filter(Boolean)[1] === 'chat';
  const [isOpen, setIsOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<{ content: string; context?: any } | null>(null);

  const open = useCallback((message?: string, context?: any) => {
    setIsOpen(true);
    if (message) setPendingMessage({ content: message, context });
  }, []);

  // Always set handle so ArticleShell context menu can open the chat
  widgetHandle = { open };

  // Don't render on the standalone chat page
  if (isChatPage) return null;

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          className="chat-widget-btn"
          aria-label={t(locale, 'chat.openChat')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
      {isOpen && (
        <div className="chat-widget-panel">
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
